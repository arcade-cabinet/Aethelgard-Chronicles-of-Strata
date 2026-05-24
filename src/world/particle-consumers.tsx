/**
 * M_REGISTRY.6 + M_HIERARCHY.1 — particle CONSUMERS.
 *
 * Hierarchy contract (user, 2026-05-23: "consumers vs archetypes is
 * a CRITICAL hierarchy"):
 *   ARCHETYPE = the abstract particle primitive — spawn → age → cull
 *               state-machine + per-frame render contract. Lives in
 *               ParticleEmitter.tsx (the ParticleEmitter component
 *               + ParticleEmitterSpec interface + BaseParticle type).
 *               There is ONE particle archetype in the codebase.
 *   CONSUMER  = a tuned configuration of that archetype, bound to a
 *               domain trigger (this file). Each consumer declares
 *               its spawn cadence, per-particle payload, render
 *               geometry, lifetime. THIS file holds the consumers.
 *   SKIN      = the visual overlay parameters per consumer (color,
 *               opacity curve, scale) — for now consumers carry
 *               their own visual config inline; a future M_REGISTRY.7
 *               pass can lift these onto SKINS[faction].particles
 *               so a third tribe ships its own consumer overrides.
 *
 * Consumers registered here:
 *   - rainConsumer            (biome-weather=rain, world-wide point cloud)
 *   - sawdustConsumer         (per build-site entity, ballistic cone puffs)
 *   - buildCompleteConsumer   (per-Building completion event, expanding sphere)
 *   - victoryConfettiConsumer (game-state=win, gravity-driven box pieces)
 *   - chimneySmokeConsumer    (per complete House, periodic grey puff)
 */
import { unpackEntity } from 'koota';
import { BoxGeometry, ConeGeometry, SphereGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld } from '@/core/hex';
import { AssignedJob, Building, HexPosition, Unit } from '@/ecs/components';
import type { ParticleEmitterSpec } from './ParticleEmitter';

// ---------------------------------------------------------------------------
// Shared geometry — created once at module load.
// ---------------------------------------------------------------------------

const sawdustGeo = new ConeGeometry(0.06, 0.12, 5);
const buildCompleteGeo = new SphereGeometry(1, 12, 8);
const confettiGeo = new BoxGeometry(0.18, 0.06, 0.12);

// ---------------------------------------------------------------------------
// RAIN — biome-wide constant emitter while weather=rain.
// ---------------------------------------------------------------------------

interface RainDrop {
  id: number;
  age: number;
  x: number;
  z: number;
  /** Starting y; the drop falls from this each frame. */
  startY: number;
}

const RAIN_FALL_SPEED = 18;
const RAIN_FIELD_HEIGHT = 30;
/** Rain emits a flat density of drops per tile within the board span. */
const RAIN_TARGET_COUNT = 1200;

export const rainConsumer: ParticleEmitterSpec<RainDrop> = {
  name: 'rain',
  seedTag: 'rain',
  // Drops loop quickly; lifetime is "time to fall through the field".
  lifetime: RAIN_FIELD_HEIGHT / RAIN_FALL_SPEED + 0.1,
  tick({ game, rng, live, nextId }) {
    if (game.weather.state !== 'rain') return null;
    // Maintain a steady drop count: top up to RAIN_TARGET_COUNT when
    // aged-out drops cull. Spawn a batch of fresh drops scaled to the
    // board span so coverage matches the visible board.
    const need = RAIN_TARGET_COUNT - live.length;
    if (need <= 0) return null;
    const span = game.board.radius * 2.2;
    const fresh: RainDrop[] = [];
    for (let i = 0; i < need; i++) {
      fresh.push({
        id: nextId(),
        age: 0,
        x: (rng() - 0.5) * span,
        z: (rng() - 0.5) * span,
        startY: RAIN_FIELD_HEIGHT,
      });
    }
    return fresh;
  },
  renderParticle(p) {
    const y = p.startY - RAIN_FALL_SPEED * p.age;
    // M_EXPANSION.S.68 — wind drift. Each drop drifts +x/+z over age
    // for a wind-bent rainfall look (vs perfectly-vertical drops).
    // Drift coefficients are tuned for a 'breezy rain' read; storms
    // would multiply these once a wind-intensity slot lands on Weather.
    const WIND_X = 1.4;
    const WIND_Z = 0.6;
    return (
      <mesh key={p.id} position={[p.x + WIND_X * p.age, y, p.z + WIND_Z * p.age]}>
        <sphereGeometry args={[0.05, 4, 3]} />
        <meshBasicMaterial color="#9ec5e8" transparent opacity={0.6} />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// SAWDUST — per actively-BUILDING peon, ballistic cone puffs.
// ---------------------------------------------------------------------------

interface SawdustPuff {
  id: number;
  age: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
}

const SAWDUST_LIFETIME = 0.6;
const SAWDUST_INTERVAL = 0.35;
const SAWDUST_PER_FRAME_CAP = 4;

interface SawdustState {
  /** Per-entity emission accumulator — tracks "next spawn due" timer. */
  acc: Map<number, number>;
}
// Module-level state for the sawdust emitter — survives across renders
// because the ParticleEmitter is mounted once per session.
const sawdustState: SawdustState = { acc: new Map() };

export const sawdustConsumer: ParticleEmitterSpec<SawdustPuff> = {
  name: 'sawdust',
  seedTag: 'sawdust',
  lifetime: SAWDUST_LIFETIME,
  tick({ game, delta, rng, nextId }) {
    const live = new Set<number>();
    let spawnedThisFrame = 0;
    const fresh: SawdustPuff[] = [];
    for (const e of game.world.query(Unit, AssignedJob, HexPosition)) {
      if (e.get(AssignedJob)?.state !== 'BUILDING') continue;
      const id = unpackEntity(e).entityId;
      live.add(id);
      const next = (sawdustState.acc.get(id) ?? SAWDUST_INTERVAL) + delta;
      if (next < SAWDUST_INTERVAL) {
        sawdustState.acc.set(id, next);
        continue;
      }
      sawdustState.acc.set(id, 0);
      if (spawnedThisFrame >= SAWDUST_PER_FRAME_CAP) continue;
      const h = e.get(HexPosition);
      if (!h) continue;
      const w = axialToWorld(h.q, h.r);
      const angle = rng() * Math.PI * 2;
      fresh.push({
        id: nextId(),
        age: 0,
        x: w.x,
        y: h.level * TILE_HEIGHT + 0.5,
        z: w.z,
        vx: Math.cos(angle) * 0.6,
        vz: Math.sin(angle) * 0.6,
      });
      spawnedThisFrame += 1;
    }
    // GC accumulators for entities no longer BUILDING.
    for (const id of sawdustState.acc.keys()) {
      if (!live.has(id)) sawdustState.acc.delete(id);
    }
    return fresh.length > 0 ? fresh : null;
  },
  renderParticle(p) {
    const t = p.age / SAWDUST_LIFETIME;
    const x = p.x + p.vx * p.age;
    const z = p.z + p.vz * p.age;
    // Small arc — rises then falls.
    const y = p.y + 0.4 * t - 0.8 * t * t;
    const opacity = (1 - t) * 0.85;
    return (
      <mesh key={p.id} position={[x, y, z]} rotation={[0, t * 4, t * 6]} geometry={sawdustGeo}>
        <meshBasicMaterial color="#fbbf24" transparent opacity={opacity} />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// BUILD-COMPLETE — one-shot expanding sphere on Building.isComplete=true.
// ---------------------------------------------------------------------------

interface CompletePuff {
  id: number;
  age: number;
  x: number;
  y: number;
  z: number;
}

const COMPLETE_LIFETIME = 1.0;
const COMPLETE_MAX_RADIUS = HEX_RADIUS * 0.9;

interface BuildCompleteState {
  /** Buildings we've already emitted for (by entity id). */
  seen: Set<number>;
}
const buildCompleteState: BuildCompleteState = { seen: new Set() };

export const buildCompleteConsumer: ParticleEmitterSpec<CompletePuff> = {
  name: 'build-complete-fx',
  seedTag: 'build-complete',
  lifetime: COMPLETE_LIFETIME,
  tick({ game, nextId }) {
    const fresh: CompletePuff[] = [];
    for (const e of game.world.query(Building, HexPosition)) {
      if (!e.get(Building)?.isComplete) continue;
      const id = unpackEntity(e).entityId;
      if (buildCompleteState.seen.has(id)) continue;
      buildCompleteState.seen.add(id);
      const h = e.get(HexPosition);
      if (!h) continue;
      const w = axialToWorld(h.q, h.r);
      fresh.push({
        id: nextId(),
        age: 0,
        x: w.x,
        y: h.level * TILE_HEIGHT + 0.4,
        z: w.z,
      });
    }
    return fresh.length > 0 ? fresh : null;
  },
  renderParticle(p) {
    const t = p.age / COMPLETE_LIFETIME;
    const scale = COMPLETE_MAX_RADIUS * (0.3 + 0.7 * t);
    const opacity = (1 - t) * 0.7;
    return (
      <mesh
        key={p.id}
        position={[p.x, p.y + t * 0.8, p.z]}
        scale={[scale, scale, scale]}
        geometry={buildCompleteGeo}
      >
        <meshBasicMaterial color="#e0d4b8" transparent opacity={opacity} />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// VICTORY CONFETTI — one-shot burst on game.outcome → 'win'.
// ---------------------------------------------------------------------------

interface ConfettiPiece {
  id: number;
  age: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  /** Color index into CONFETTI_COLORS. */
  ci: number;
}

const CONFETTI_LIFETIME = 3.0;
const CONFETTI_COUNT = 60;
const CONFETTI_COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#fde047'] as const;

interface ConfettiState {
  /** True once we've emitted for the current win event. */
  emitted: boolean;
  /** Last seen outcome — flip detection. */
  lastOutcome: string;
}
const confettiState: ConfettiState = { emitted: false, lastOutcome: 'playing' };

export const victoryConfettiConsumer: ParticleEmitterSpec<ConfettiPiece> = {
  name: 'victory-confetti',
  seedTag: 'confetti',
  lifetime: CONFETTI_LIFETIME,
  tick({ game, rng, nextId }) {
    // Reset state when outcome flips back to 'playing' (new game).
    if (game.outcome !== confettiState.lastOutcome) {
      confettiState.lastOutcome = game.outcome;
      if (game.outcome === 'playing') {
        confettiState.emitted = false;
        return null;
      }
    }
    // Emit exactly once on the win transition.
    if (game.outcome !== 'win' || confettiState.emitted) return null;
    confettiState.emitted = true;
    const burst: ConfettiPiece[] = [];
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      const angle = (i / CONFETTI_COUNT) * Math.PI * 2;
      const speed = 4 + rng() * 3;
      burst.push({
        id: nextId(),
        age: 0,
        vx: Math.cos(angle) * speed,
        vy: 6 + rng() * 4,
        vz: Math.sin(angle) * speed,
        spin: rng() < 0.5 ? -1 : 1,
        ci: i % CONFETTI_COLORS.length,
      });
    }
    return burst;
  },
  renderParticle(p) {
    const t = p.age;
    const gravity = 9.8;
    const x = p.vx * t;
    const y = HEX_RADIUS + p.vy * t - 0.5 * gravity * t * t;
    const z = p.vz * t;
    const rotY = p.spin * t * 6;
    const rotZ = p.spin * t * 4;
    const opacity = Math.max(0, 1 - t / CONFETTI_LIFETIME);
    return (
      <mesh key={p.id} position={[x, y, z]} rotation={[0, rotY, rotZ]} geometry={confettiGeo}>
        <meshStandardMaterial
          color={CONFETTI_COLORS[p.ci] ?? CONFETTI_COLORS[0]}
          transparent
          opacity={opacity}
          flatShading
        />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// CHIMNEY-SMOKE (M_EXPANSION.A.12) — per completed House, a slow puff
// rising from the chimney; signals "inhabited" without any HUD chrome.
// ---------------------------------------------------------------------------

interface SmokePuff {
  id: number;
  age: number;
  x: number;
  y: number;
  z: number;
}

const SMOKE_LIFETIME = 3.5;
const SMOKE_INTERVAL = 0.9;
const SMOKE_PER_FRAME_CAP = 4;
const smokeGeo = new SphereGeometry(0.16, 6, 5);

interface SmokeState {
  /** Per-House accumulator (s since last puff), keyed by entity id. */
  acc: Map<number, number>;
}
const smokeState: SmokeState = { acc: new Map() };

export const chimneySmokeConsumer: ParticleEmitterSpec<SmokePuff> = {
  name: 'chimney-smoke',
  seedTag: 'chimney-smoke',
  lifetime: SMOKE_LIFETIME,
  tick({ game, delta, rng, nextId }) {
    const live = new Set<number>();
    let spawnedThisFrame = 0;
    const fresh: SmokePuff[] = [];
    for (const e of game.world.query(Building, HexPosition)) {
      const b = e.get(Building);
      if (!b?.isComplete || b.buildingType !== 'House') continue;
      const id = unpackEntity(e).entityId;
      live.add(id);
      const next = (smokeState.acc.get(id) ?? SMOKE_INTERVAL) + delta;
      if (next < SMOKE_INTERVAL) {
        smokeState.acc.set(id, next);
        continue;
      }
      smokeState.acc.set(id, 0);
      if (spawnedThisFrame >= SMOKE_PER_FRAME_CAP) continue;
      const h = e.get(HexPosition);
      if (!h) continue;
      const w = axialToWorld(h.q, h.r);
      // small in-tile jitter so puffs from the same chimney don't stack
      const jitter = (rng() - 0.5) * 0.1;
      fresh.push({
        id: nextId(),
        age: 0,
        x: w.x + jitter,
        y: h.level * TILE_HEIGHT + 0.9,
        z: w.z + jitter,
      });
      spawnedThisFrame += 1;
    }
    for (const id of smokeState.acc.keys()) {
      if (!live.has(id)) smokeState.acc.delete(id);
    }
    return fresh.length > 0 ? fresh : null;
  },
  renderParticle(p) {
    const t = p.age / SMOKE_LIFETIME;
    const y = p.y + t * 1.6;
    const scale = 1 + t * 1.5;
    const opacity = (1 - t) * 0.35;
    return (
      <mesh key={p.id} position={[p.x, y, p.z]} scale={scale} geometry={smokeGeo}>
        <meshBasicMaterial color="#94a3b8" transparent opacity={opacity} />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// SNOW — per-biome MOUNTAIN ambient flakes. M_REFACTOR.1 biome-localized
// consumer (the first one): drops settle over MOUNTAIN tiles only, not
// the whole board. Sparser than rain (snow falls slowly + only over
// peaks) but constant when any mountain tile is on-board.
// ---------------------------------------------------------------------------

interface SnowFlake {
  id: number;
  age: number;
  x: number;
  z: number;
  startY: number;
}

const SNOW_FALL_SPEED = 2.4;
const SNOW_FIELD_HEIGHT = 12;
const SNOW_LIFETIME = SNOW_FIELD_HEIGHT / SNOW_FALL_SPEED + 0.1;
/**
 * Mountain tile centres are sampled at consumer spawn time; we keep
 * a flat target of ~6 flakes per visible mountain tile. With a typical
 * Medium board (~25 mountain tiles) that's ~150 flakes — visible but
 * not a snowstorm.
 */
const SNOW_PER_MOUNTAIN = 6;
const snowGeo = new SphereGeometry(0.05, 4, 3);

export const snowConsumer: ParticleEmitterSpec<SnowFlake> = {
  name: 'snow',
  seedTag: 'snow',
  lifetime: SNOW_LIFETIME,
  tick({ game, rng, live, nextId }) {
    // Collect mountain tiles each tick (cheap — board tiles are a Map);
    // a future polish pass can memoize once at game start.
    const mountains: Array<[number, number]> = [];
    for (const tile of game.board.tiles.values()) {
      if (tile.type === 'MOUNTAIN') mountains.push([tile.q, tile.r]);
    }
    if (mountains.length === 0) return null;
    const target = mountains.length * SNOW_PER_MOUNTAIN;
    const need = target - live.length;
    if (need <= 0) return null;
    const fresh: SnowFlake[] = [];
    for (let i = 0; i < need; i++) {
      const pick = mountains[Math.floor(rng() * mountains.length)];
      if (!pick) continue;
      const [q, r] = pick;
      const { x: wx, z: wz } = axialToWorld(q, r);
      fresh.push({
        id: nextId(),
        age: 0,
        x: wx + (rng() - 0.5) * HEX_RADIUS * 1.6,
        z: wz + (rng() - 0.5) * HEX_RADIUS * 1.6,
        startY: SNOW_FIELD_HEIGHT,
      });
    }
    return fresh;
  },
  renderParticle(p) {
    // Slow drift + light wobble in x — snow visibly flutters.
    const y = p.startY - SNOW_FALL_SPEED * p.age + TILE_HEIGHT * 1.2;
    const wobble = Math.sin(p.age * 1.7 + p.id) * 0.06;
    return (
      <mesh key={p.id} position={[p.x + wobble, y, p.z]} geometry={snowGeo}>
        <meshBasicMaterial color="#f8fafc" transparent opacity={0.85} />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// BLOOD-SPLASH — per-unit-combat-hit burst. M_REFACTOR.1 unit-localized
// consumer: spawns 4-6 short-lived red pucks at the target position of
// every game.lastDamageEvents entry where damageType==='normal' and
// the hit landed (parried hits don't bleed). The event-batch identity
// drives the spawn — same pattern CombatText uses.
// ---------------------------------------------------------------------------

interface BloodPuck {
  id: number;
  age: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

interface BloodState {
  lastBatch: unknown;
}

const BLOOD_LIFETIME = 0.5;
const BLOOD_GRAVITY = 4.0;
const bloodGeo = new SphereGeometry(0.06, 4, 3);
const bloodState: BloodState = { lastBatch: null };

export const bloodSplashConsumer: ParticleEmitterSpec<BloodPuck> = {
  name: 'blood-splash',
  seedTag: 'blood',
  lifetime: BLOOD_LIFETIME,
  tick({ game, rng, nextId }) {
    const batch = game.lastDamageEvents;
    if (batch === bloodState.lastBatch) return null;
    bloodState.lastBatch = batch;
    if (batch.length === 0) return null;
    const fresh: BloodPuck[] = [];
    for (const ev of batch) {
      // Skip parried hits and non-normal damage (magic/siege get
      // their own future consumers — magic-burst, stone-chip).
      if (ev.parried) continue;
      if (ev.damageType !== 'normal') continue;
      if (ev.damage <= 0) continue;
      const t = ev.target.get(Unit) ? ev.target : null;
      if (!t) continue;
      const hex = t.get(HexPosition);
      if (!hex) continue;
      const { x: wx, z: wz } = axialToWorld(hex.q, hex.r);
      const wy = hex.level * TILE_HEIGHT + 0.4;
      const count = 4 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2;
        const speed = 1.4 + rng() * 0.8;
        fresh.push({
          id: nextId(),
          age: 0,
          x: wx,
          y: wy,
          z: wz,
          vx: Math.cos(angle) * speed,
          vy: 1.2 + rng() * 0.8,
          vz: Math.sin(angle) * speed,
        });
      }
    }
    return fresh.length > 0 ? fresh : null;
  },
  renderParticle(p) {
    const y = p.y + p.vy * p.age - 0.5 * BLOOD_GRAVITY * p.age * p.age;
    const x = p.x + p.vx * p.age;
    const z = p.z + p.vz * p.age;
    const t = p.age / BLOOD_LIFETIME;
    return (
      <mesh key={p.id} position={[x, Math.max(0.05, y), z]} geometry={bloodGeo}>
        <meshBasicMaterial color="#991b1b" transparent opacity={1 - t} />
      </mesh>
    );
  },
};

// ---------------------------------------------------------------------------
// EMBERS — per-building-type Barracks ambient. M_REFACTOR.1 building-
// localized consumer: every complete Barracks emits orange ember sparks
// rising from the building site (the "always-on forge" tell). Same
// per-entity per-second cadence as chimneySmoke.
// ---------------------------------------------------------------------------

interface Ember {
  id: number;
  age: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

interface EmbersState {
  acc: Map<number, number>;
  lastTick: number;
}

const EMBER_LIFETIME = 1.4;
const EMBER_INTERVAL = 0.45;
const emberGeo = new SphereGeometry(0.04, 4, 3);
const embersState: EmbersState = { acc: new Map(), lastTick: 0 };

export const embersConsumer: ParticleEmitterSpec<Ember> = {
  name: 'embers',
  seedTag: 'embers',
  lifetime: EMBER_LIFETIME,
  tick({ game, delta, rng, nextId }) {
    const fresh: Ember[] = [];
    embersState.lastTick = delta;
    for (const e of game.world.query(Building, HexPosition)) {
      const b = e.get(Building);
      if (!b?.isComplete || b.buildingType !== 'Barracks') continue;
      const id = unpackEntity(e).entityId;
      const acc = (embersState.acc.get(id) ?? 0) + delta;
      if (acc < EMBER_INTERVAL) {
        embersState.acc.set(id, acc);
        continue;
      }
      embersState.acc.set(id, 0);
      const hex = e.get(HexPosition);
      if (!hex) continue;
      const { x: wx, z: wz } = axialToWorld(hex.q, hex.r);
      const wy = hex.level * TILE_HEIGHT + 0.6;
      // 2-3 embers per puff, varying lateral direction
      const count = 2 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2;
        fresh.push({
          id: nextId(),
          age: 0,
          x: wx + (rng() - 0.5) * 0.3,
          y: wy,
          z: wz + (rng() - 0.5) * 0.3,
          vx: Math.cos(angle) * 0.4,
          vy: 0.9 + rng() * 0.5,
          vz: Math.sin(angle) * 0.4,
        });
      }
    }
    // M_SIMPLIFY.3 — removed dead `liveIds = new Set([...live].map(...)); void liveIds;`
    // allocation. The entity-id GC happens via the loop above; the
    // per-particle `live` arg isn't needed for ember accumulator
    // cleanup (acc keys are entity ids, not particle ids).
    return fresh.length > 0 ? fresh : null;
  },
  renderParticle(p) {
    const t = p.age / EMBER_LIFETIME;
    const y = p.y + p.vy * p.age - 0.3 * p.age * p.age;
    const x = p.x + p.vx * p.age;
    const z = p.z + p.vz * p.age;
    // Color fades from yellow-orange to dim red as the ember cools.
    const color = t < 0.5 ? '#fbbf24' : '#dc2626';
    return (
      <mesh key={p.id} position={[x, y, z]} geometry={emberGeo}>
        <meshBasicMaterial color={color} transparent opacity={1 - t} />
      </mesh>
    );
  },
};
