import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './theme';

/**
 * M_POLISH2.MODES.39 — persistent win-condition reminder.
 *
 * A small top-centre pill that announces what the player needs to
 * do to WIN this match — varies by mode. Sits at top:8 in the
 * centre column (away from the resource bar at top-left and the
 * speed/pause pill at top-right).
 *
 * Per-mode copy:
 *   border-clash  — "Destroy enemy base"
 *   frontier-raid — "Survive 5 raids"
 *   long-reign    — "Outlast the realm"
 *   strata-wars   — "Control 80% of the realm"
 *   age-of-strata — "Reach the final era"
 *   coexistence   — "Sandbox" (gentle reminder there's no race)
 *
 * Hidden when game.outcome !== 'playing' (the GameOverModal takes
 * over the message at that point).
 */
const COPY_FOR_MODE = {
  'border-clash': '⚔ Destroy enemy base',
  'frontier-raid': '🏹 Survive the raids',
  'long-reign': '👑 Outlast the realm',
  'strata-wars': '🛡 Control the realm',
  'age-of-strata': '📜 Reach the final era',
  coexistence: '☮ Sandbox',
  // M_V11.TUTORIAL (#77f) — guided 5-min teaching scenario.
  tutorial: '📖 Tutorial — follow the objectives',
  // M_V11.CAMPAIGN (#77g) — narrative chapter scenarios.
  campaign: '📜 Chapter — complete the objectives',
  // M_V11.WAVE-DEFENSE (#77h) — survival mode.
  'wave-defense': '🛡 Hold the Palace — survive all waves',
  // M_V11.DAILY-CHALLENGE (#77i) — same seed every player today.
  'daily-challenge': '🏆 Daily Challenge — race the leaderboard',
} as const;

export function WinConditionPill({ game }: { game: GameState }) {
  if (game.outcome !== 'playing') return null;
  const copy = COPY_FOR_MODE[game.mode] ?? COPY_FOR_MODE['border-clash'];
  return (
    <div
      id="win-condition-pill"
      role="status"
      aria-label={`Win condition: ${copy}`}
      style={{
        position: 'fixed',
        // M_V11.POLISH.HUD-CROWDING — sit below the resource bar on
        // mobile-portrait (top:48 keeps clear of the top-right
        // diplomacy banner + the top-left resource strip). On wider
        // viewports the centred top:8 is fine (resource bar + speed
        // pill don't reach the centre).
        top: 'calc(env(safe-area-inset-top, 0px) + clamp(8px, 48px - 8vw, 48px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 90,
        padding: '6px 14px',
        borderRadius: 999,
        background: 'rgba(9, 13, 22, 0.72)',
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.gold,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: '0.78rem',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
      }}
    >
      {copy}
    </div>
  );
}
