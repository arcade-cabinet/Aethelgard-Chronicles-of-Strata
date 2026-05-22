import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import type { GameOutcome } from '@/ecs/systems/win-loss';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';

/** A win/loss stat line. */
interface StatLine {
  /** Label text. */
  label: string;
  /** Value text. */
  value: string;
}

/**
 * The end-of-game modal — a Radix Dialog (so focus is trapped, `role="dialog"`
 * and `aria-modal` are set, and Escape/keyboard work). Shown when `game.outcome`
 * is 'win' or 'loss'; win uses gold "Victory!" styling, loss red "Defeat!". The
 * title element keeps the `modal-title-win` / `modal-title-loss` classes the
 * e2e tests assert against.
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

  const isWin = outcome === 'win';
  const stats: StatLine[] = [
    { label: 'Gold Earned', value: String(game.economy.gold) },
    { label: 'Lumber Harvested', value: String(game.economy.wood) },
    { label: 'Enemies Vanquished', value: String(game.economy.kills) },
  ];

  return (
    <Dialog.Root open={outcome !== 'playing'}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.9)', zIndex: 1000 }}
        />
        <Dialog.Content
          id="game-over-modal"
          aria-describedby={undefined}
          // the game has ended — block the Escape/outside-click close paths
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(9,13,22,0.97)',
            border: `2px solid ${HUD_THEME.color.border}`,
            borderRadius: 24,
            padding: 40,
            textAlign: 'center',
            maxWidth: 440,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            zIndex: 1001,
          }}
        >
          <Dialog.Title
            className={isWin ? 'modal-title-win' : 'modal-title-loss'}
            style={{
              fontFamily: HUD_THEME.font.display,
              fontSize: '2.6rem',
              fontWeight: 800,
              margin: '0 0 10px',
              color: isWin ? HUD_THEME.color.gold : HUD_THEME.color.danger,
            }}
          >
            {isWin ? 'Victory!' : 'Defeat!'}
          </Dialog.Title>
          <p style={{ color: HUD_THEME.color.muted, marginBottom: 24 }}>
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
              <span style={{ color: HUD_THEME.color.accent }}>{s.value}</span>
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
              background: HUD_THEME.blueGradient,
              color: '#fff',
              fontSize: '1.05rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Re-enter Aethelgard
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
