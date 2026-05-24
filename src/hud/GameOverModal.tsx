import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { Building, FactionTrait } from '@/ecs/components';
import type { GameOutcome } from '@/ecs/systems/win-loss';
import type { GameState } from '@/game/game-state';
import { formatInt, formatTime } from './format';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';

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
  // M_PROCESS.REVIEW must-fix #2 — 'draw' outcome was rendering
  // as "Defeat!" (loss styling + loss copy) because the original
  // ternary only branched isWin true/false. M_TURNS.2 added 'draw'
  // for turn-cap ties; surface it with neutral copy + accent
  // styling that reads as "the match ended even".
  const isDraw = outcome === 'draw';
  const titleText = isWin ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat!';
  const titleColor = isWin
    ? HUD_THEME.color.gold
    : isDraw
      ? HUD_THEME.color.accent
      : HUD_THEME.color.danger;
  const titleClass = isWin ? 'modal-title-win' : isDraw ? 'modal-title-draw' : 'modal-title-loss';
  const flavorText = isWin
    ? 'You have razed the enemy base and defended Aethelgard.'
    : isDraw
      ? 'The realms reach equilibrium. The clock runs out with neither side prevailing.'
      : 'The enemy razed your home base. Aethelgard has fallen.';
  // M_MODES.10 — controlled-tile-time score integral; rounded to whole units.
  const playerScore = Math.round(game.score.player);
  const enemyScore = Math.round(game.score.enemy);
  // M_EXPANSION.U.122 — count the player faction's surviving
  // complete buildings at outcome-flip time. Cheap one-pass query.
  let playerBuildings = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(Building)?.isComplete && e.get(FactionTrait)?.faction === 'player') {
      playerBuildings += 1;
    }
  }
  const stats: StatLine[] = [
    // M_AUDIT2.UX.10 — locale-formatted thousands separator.
    { label: 'Gold Earned', value: formatInt(game.economy.player.gold) },
    { label: 'Lumber Harvested', value: formatInt(game.economy.player.wood) },
    { label: 'Enemies Vanquished', value: formatInt(game.economy.player.kills) },
    // M_EXPANSION.U.122 — buildings, peak supply, time elapsed.
    { label: 'Buildings Standing', value: formatInt(playerBuildings) },
    {
      label: 'Peak Supply',
      value: `${formatInt(game.economy.player.peakSupply)} / ${formatInt(game.economy.player.maxSupply)}`,
    },
    { label: 'Time Elapsed', value: formatTime(game.clock.elapsed) },
    { label: 'Territory Score', value: `${playerScore} vs ${enemyScore}` },
  ];

  return (
    <Dialog.Root open={outcome !== 'playing'}>
      {/* M_MICRO.10.1 — ModalShell + GameOverModal-specific overrides
          (heavier overlay, larger card, terminal-state escape-block
          via blockClose). */}
      <ModalShell
        contentId="game-over-modal"
        zIndex={1000}
        width="auto"
        maxHeight="none"
        blockClose
        contentStyle={{
          background: 'rgba(9,13,22,0.97)',
          borderRadius: 24,
          padding: 40,
          textAlign: 'center',
          maxWidth: 440,
          fontFamily: HUD_THEME.font.body,
        }}
      >
        <Dialog.Title
          className={titleClass}
          style={{
            fontFamily: HUD_THEME.font.display,
            fontSize: '2.6rem',
            fontWeight: 800,
            margin: '0 0 10px',
            color: titleColor,
          }}
        >
          {titleText}
        </Dialog.Title>
        <p style={{ color: HUD_THEME.color.muted, marginBottom: 24 }}>{flavorText}</p>
        {/* M_POLISH2.MODES.41b — long-reign narrative line. Sits ABOVE
              the generic stat list and reads as a one-line summary
              of the player's reign. */}
        {game.mode === 'long-reign' && (
          <div
            id="long-reign-narrative"
            style={{
              padding: '12px 14px',
              marginBottom: 18,
              borderRadius: 10,
              background: 'rgba(56, 189, 248, 0.08)',
              border: `1px solid ${HUD_THEME.color.border}`,
              color: HUD_THEME.color.gold,
              fontFamily: HUD_THEME.font.display,
              fontSize: '0.95rem',
              textAlign: 'center',
            }}
          >
            👑 Survived {formatTime(game.clock.elapsed)} — Endured{' '}
            {formatInt(game.randomEvents.fired ?? 0)} escalation
            {(game.randomEvents.fired ?? 0) === 1 ? '' : 's'} — Built {formatInt(playerBuildings)}{' '}
            structure
            {playerBuildings === 1 ? '' : 's'}
          </div>
        )}
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
      </ModalShell>
    </Dialog.Root>
  );
}
