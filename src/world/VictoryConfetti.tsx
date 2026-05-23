import { useFrame } from '@react-three/fiber';
import { useMemo, useRef, useState } from 'react';
import { BoxGeometry } from 'three';
import { HEX_RADIUS } from '@/config/world';
import { createMapPrng } from '@/core/rng';
import type { GameState } from '@/game/game-state';

/** Number of confetti pieces in the burst. */
const COUNT = 60;
/** Confetti lifetime (seconds). */
const LIFETIME = 3.0;
/** Per-piece base color rotation (gold + amber + bronze for an epic-fantasy victory feel). */
const COLORS = ['#fbbf24', '#f59e0b', '#d97706', '#fde047'];
const pieceGeo = new BoxGeometry(0.18, 0.06, 0.12);

interface Piece {
  /** Stable id for React key. */
  id: number;
  /** Initial velocity (world units / s). */
  vx: number;
  vy: number;
  vz: number;
  /** Spin axis sign. */
  spin: number;
  /** Color index. */
  ci: number;
}

/**
 * Victory confetti (M_POLISH.4). On the moment `game.outcome` flips to
 * `'win'`, a burst of gold/amber/bronze confetti pieces sprays from the
 * world origin (camera target) outward + upward, ballistically falls
 * under gravity, and fades out as it descends. Pure presentation —
 * GameOverModal still surfaces the modal after the confetti settles.
 */
export function VictoryConfetti({ game }: { game: GameState }) {
  const [pieces, setPieces] = useState<Piece[]>([]);
  const elapsedRef = useRef(0);
  const lastOutcomeRef = useRef<string>(game.outcome);
  // Seeded rng — no Math.random per CLAUDE.md determinism contract.
  const rng = useMemo(() => createMapPrng(`${game.seedPhrase}:confetti`), [game.seedPhrase]);

  useFrame((_, delta) => {
    // Detect the win transition once.
    if (game.outcome !== lastOutcomeRef.current) {
      lastOutcomeRef.current = game.outcome;
      if (game.outcome === 'win') {
        elapsedRef.current = 0;
        const burst: Piece[] = [];
        for (let i = 0; i < COUNT; i++) {
          const angle = (i / COUNT) * Math.PI * 2;
          const speed = 4 + rng() * 3;
          burst.push({
            id: i,
            vx: Math.cos(angle) * speed,
            vy: 6 + rng() * 4, // upward burst
            vz: Math.sin(angle) * speed,
            spin: rng() < 0.5 ? -1 : 1,
            ci: i % COLORS.length,
          });
        }
        setPieces(burst);
      } else {
        setPieces([]);
      }
    }
    // Advance the burst if active.
    if (pieces.length > 0) {
      elapsedRef.current += delta;
      if (elapsedRef.current >= LIFETIME) setPieces([]);
    }
  });

  if (pieces.length === 0) return null;
  const t = elapsedRef.current;
  const gravity = 9.8;
  const opacity = Math.max(0, 1 - t / LIFETIME);
  return (
    <group name="victory-confetti" position={[0, HEX_RADIUS, 0]}>
      {pieces.map((p) => {
        const x = p.vx * t;
        const y = p.vy * t - 0.5 * gravity * t * t;
        const z = p.vz * t;
        const rotY = p.spin * t * 6;
        const rotZ = p.spin * t * 4;
        return (
          <mesh key={p.id} position={[x, y, z]} rotation={[0, rotY, rotZ]} geometry={pieceGeo}>
            <meshStandardMaterial
              color={(COLORS[p.ci] ?? '#fbbf24') as string}
              transparent
              opacity={opacity}
              flatShading
            />
          </mesh>
        );
      })}
    </group>
  );
}
