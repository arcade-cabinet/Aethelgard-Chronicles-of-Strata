import { useEffect, useState } from 'react';
import type { GameOutcome } from '@/ecs/systems/win-loss';
import type { GameState } from '@/game/game-state';

/** A win/loss stat line. */
interface StatLine {
  /** Label text. */
  label: string;
  /** Value text. */
  value: string;
}

/**
 * The end-of-game modal. Shown when `game.outcome` is 'win' or 'loss'. Win uses
 * gold "Victory!" styling, loss uses red "Defeat!". Stat lines report the
 * session totals; a button reloads to the launcher. The title element carries
 * `modal-title-win` / `modal-title-loss` classes for e2e assertions.
 */
export function GameOverModal({ game }: { game: GameState }) {
  const [outcome, setOutcome] = useState<GameOutcome>(game.outcome);

  useEffect(() => {
    // poll game.outcome until it goes terminal, then stop — once the game has
    // ended runEconomyTick freezes, so there is nothing further to watch.
    let raf = 0;
    const tick = () => {
      setOutcome(game.outcome);
      if (game.outcome === 'playing') raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  if (outcome === 'playing') return null;

  const isWin = outcome === 'win';
  const stats: StatLine[] = [
    { label: 'Gold Earned', value: String(game.economy.gold) },
    { label: 'Lumber Harvested', value: String(game.economy.wood) },
    { label: 'Enemies Vanquished', value: String(game.economy.kills) },
  ];

  return (
    <div
      id="game-over-modal"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(3, 7, 18, 0.9)',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: 'rgba(9, 13, 22, 0.95)',
          border: '2px solid rgba(56, 189, 248, 0.4)',
          borderRadius: 24,
          padding: 40,
          textAlign: 'center',
          maxWidth: 440,
          color: '#f1f5f9',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          className={isWin ? 'modal-title-win' : 'modal-title-loss'}
          style={{
            fontSize: '2.6rem',
            fontWeight: 800,
            marginBottom: 10,
            color: isWin ? '#fbbf24' : '#ef4444',
          }}
        >
          {isWin ? 'Victory!' : 'Defeat!'}
        </div>
        <p style={{ color: '#94a3b8', marginBottom: 24 }}>
          {isWin
            ? 'You have shattered the Goblin Portal and defended Aethelgard.'
            : 'The Goblins razed your Town Hall. Aethelgard has fallen.'}
        </p>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontSize: '0.9rem',
            }}
          >
            <span>{s.label}</span>
            <span style={{ color: '#38bdf8' }}>{s.value}</span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => location.reload()}
          style={{
            marginTop: 28,
            padding: '12px 28px',
            borderRadius: 12,
            border: 'none',
            background: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)',
            color: '#fff',
            fontSize: '1.05rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Re-enter Aethelgard
        </button>
      </div>
    </div>
  );
}
