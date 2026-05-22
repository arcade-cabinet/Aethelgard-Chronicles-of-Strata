import { useMemo } from 'react';
import { startGame } from '@/game/game-state';
import { GameCanvas } from '@/render/GameCanvas';

/** Root component. M1: immediately starts a game on a fixed seed and renders it. */
export function App() {
  const game = useMemo(() => startGame('ancient-silver-forest'), []);
  return (
    <div id="app-shell" style={{ position: 'absolute', inset: 0 }}>
      <GameCanvas game={game} />
    </div>
  );
}
