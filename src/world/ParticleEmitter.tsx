/**
 * M_REGISTRY.6 + M_HIERARCHY.1 — the PARTICLE ARCHETYPE.
 *
 * Hierarchy contract (user, 2026-05-23):
 *   ARCHETYPE = THIS file. The abstract particle primitive: the
 *               spawn → age → cull state machine + the per-frame
 *               render contract. One archetype, codified in:
 *                 - `BaseParticle` (the runtime particle shape)
 *                 - `ParticleEmitterSpec<P>` (the consumer contract)
 *                 - `ParticleEmitter<P>` (the lifecycle owner React
 *                   component that runs the spawn/age/cull loop)
 *   CONSUMER  = a tuned configuration of that archetype, bound to a
 *               domain trigger. Consumers live in particle-consumers.tsx
 *               (rainConsumer, sawdustConsumer, etc).
 *   SKIN      = the per-consumer visual overlay parameters (color,
 *               opacity curve, scale). Today consumers carry these
 *               inline; a future pass can lift them onto SKINS for
 *               per-faction overrides.
 *
 * Per spec 103 the unifying concept across Rain, Sawdust, BuildComplete,
 * VictoryConfetti, FootstepEmitter is the **state machine**, not the
 * geometry: spawn → age forward → cull. Geometry, material, dynamics
 * are per-consumer; the loop shape is the archetype.
 *
 * Each consumer passes a `ParticleEmitterSpec<P>` describing:
 *
 *   - `seedTag`     — determinism key (PRNG = createMapPrng(`${seed}:${tag}`))
 *   - `tick`        — per-frame callback returning particles to ADD this tick;
 *                     gets game + delta + rng + the live particle list
 *   - `lifetime`    — how long each particle lives (seconds)
 *   - `renderParticle` — JSX for one particle, given its current state
 *
 * Particle aging + culling is owned by the emitter; the spec only
 * describes spawn + render. This collapses the 4 sibling FX components
 * into ONE state-machine implementation + 4 thin specs.
 */
import { useFrame } from '@react-three/fiber';
import { type ReactNode, useMemo, useRef, useState } from 'react';
import { createMapPrng, type Rng } from '@/core/rng';
import type { GameState } from '@/game/game-state';

/** One particle's runtime state. The emitter spec extends this with payload. */
export interface BaseParticle {
  /** Stable id for React key — emitter assigns. */
  id: number;
  /** Seconds elapsed since spawn. */
  age: number;
}

/**
 * Spec for one particle CONSUMER (a tuned configuration of the
 * particle archetype). Generic in P (the per-particle payload —
 * consumer-specific extra fields like velocity, color index, etc).
 */
export interface ParticleEmitterSpec<P extends BaseParticle> {
  /** Component name — appears as the <group name="..."> for debugging. */
  name: string;
  /** PRNG determinism key (concatenated with game.seedPhrase). */
  seedTag: string;
  /** Particle lifetime in seconds. */
  lifetime: number;
  /**
   * Per-frame tick. Returns ZERO or MORE new particles to spawn this
   * tick. The emitter handles aging + culling automatically — return
   * only NEW particles, with `age: 0` and a fresh `id` from the
   * provided allocator.
   *
   * Get a fresh id via `nextId()`. The rng is the seeded stream for
   * this consumer.
   */
  tick(args: {
    game: GameState;
    delta: number;
    rng: Rng;
    /** Live particles this tick (read-only — for "are we active?" checks). */
    live: readonly P[];
    /** Allocate a fresh particle id. */
    nextId: () => number;
  }): P[] | null;
  /**
   * Render one particle. The emitter calls this for every live particle
   * each render; output is plain JSX. Aged-out particles are culled
   * before this fires.
   */
  renderParticle(particle: P): ReactNode;
}

/** A live particle list with its current frame-time. */
interface EmitterState<P extends BaseParticle> {
  particles: P[];
}

/**
 * Generic particle emitter — the runtime owner of the particle
 * ARCHETYPE. ONE instance hosts the spawn → age → cull loop for one
 * CONSUMER (a ParticleEmitterSpec). Renders the JSX returned by
 * spec.renderParticle for each live particle inside a named group.
 */
export function ParticleEmitter<P extends BaseParticle>({
  game,
  spec,
}: {
  game: GameState;
  spec: ParticleEmitterSpec<P>;
}) {
  const [state, setState] = useState<EmitterState<P>>(() => ({ particles: [] }));
  const nextIdRef = useRef(0);
  // Per-consumer seeded PRNG — determinism contract per CLAUDE.md.
  const rng = useMemo(
    () => createMapPrng(`${game.seedPhrase}:${spec.seedTag}`),
    [game.seedPhrase, spec.seedTag],
  );
  const nextId = useMemo(() => () => nextIdRef.current++, []);

  useFrame((_, delta) => {
    setState((prev) => {
      const fresh = spec.tick({ game, delta, rng, live: prev.particles, nextId });
      const hasNew = fresh !== null && fresh.length > 0;
      // Fast-path: nothing live AND nothing new to spawn → preserve identity.
      if (prev.particles.length === 0 && !hasNew) return prev;
      // Age + cull.
      const aged: P[] = [];
      for (const p of prev.particles) {
        const newAge = p.age + delta;
        if (newAge >= spec.lifetime) continue;
        aged.push({ ...p, age: newAge });
      }
      if (hasNew) {
        return { particles: aged.concat(fresh as P[]) };
      }
      if (aged.length === prev.particles.length) {
        // Nothing changed (no cull, no new) — but we DID update ages.
        // Identity-equality not preservable; return the new array.
        return { particles: aged };
      }
      return { particles: aged };
    });
  });

  if (state.particles.length === 0) return null;
  return <group name={spec.name}>{state.particles.map((p) => spec.renderParticle(p))}</group>;
}
