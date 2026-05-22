import { useMemo } from 'react';
import { ErrorBoundary } from '@/render/ErrorBoundary';
import { GameCanvas } from '@/render/GameCanvas';
import { startGame } from '@/game/game-state';

/** Shown if the 3D scene fails to load (e.g. a missing asset). */
function SceneError() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f1f5f9',
        background: '#090d16',
        fontFamily: 'sans-serif',
      }}
    >
      <p>The realm failed to load. Please reload the page.</p>
    </div>
  );
}

/** Root component. Starts a game on a fixed seed and renders it. */
export function App() {
  const game = useMemo(() => startGame('ancient-silver-forest'), []);
  return (
    <div id="app-shell" style={{ position: 'absolute', inset: 0 }}>
      <ErrorBoundary fallback={<SceneError />}>
        <GameCanvas game={game} />
      </ErrorBoundary>
    </div>
  );
}
