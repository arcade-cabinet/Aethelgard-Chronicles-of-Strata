import { Line } from '@react-three/drei';
import { useMemo } from 'react';
import { TILE_HEIGHT } from '@/config/world';
import { axialToWorld, parseHexKey } from '@/core/hex';
import type { GameState } from '@/game/game-state';

/** Draws a glowing line along the pawn's queued path. */
export function PathLine({ game, pathKeys }: { game: GameState; pathKeys: string[] }) {
  const points = useMemo<[number, number, number][]>(
    () =>
      pathKeys.map((key) => {
        const { q, r } = parseHexKey(key);
        const tile = game.board.tiles.get(key);
        const w = axialToWorld(q, r);
        return [w.x, (tile?.level ?? 0) * TILE_HEIGHT + 0.2, w.z];
      }),
    [game, pathKeys],
  );
  // drei's Line needs at least two points.
  if (points.length < 2) return null;
  return <Line points={points} color="#38bdf8" lineWidth={3} transparent opacity={0.85} />;
}
