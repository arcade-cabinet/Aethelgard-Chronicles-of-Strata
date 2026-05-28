import { useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { raidPressureForElapsed, raidPressureLabel } from '@/rules/raid-pressure';
import { HUD_THEME } from './theme';

/**
 * M_POLISH2.MODES.40 — frontier-raid pressure pill. Visible only in
 * frontier-raid mode + while the match is being played; surfaces the
 * 0..1 raid intensity curve as a 4-band label (Calm → Stirring →
 * Raiding → Total War) with tone-matched colour.
 *
 * Top-centre under the WinConditionPill so the player's eye lands on
 * the threat state without scanning.
 */
const TONE_COLOR = {
  calm: '#22c55e',
  stir: '#fbbf24',
  raid: '#fb923c',
  war: '#ef4444',
} as const;

export function RaidPressurePill({ game }: { game: GameState }) {
  const [elapsed, setElapsed] = useState(game.clock?.elapsed ?? 0);

  useEffect(() => {
    // 500ms tick — the pressure curve is slow, sub-second precision
    // doesn't change the label.
    const id = window.setInterval(() => {
      setElapsed(game.clock?.elapsed ?? 0);
    }, 500);
    return () => window.clearInterval(id);
  }, [game]);

  if (game.mode !== 'frontier-raid') return null;
  if (game.outcome !== 'playing') return null;

  const p = raidPressureForElapsed(elapsed);
  const { text, tone } = raidPressureLabel(p);

  return (
    <div
      id="raid-pressure-pill"
      role="status"
      aria-label={`Raid intensity: ${text}`}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 40px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 89,
        padding: '4px 12px',
        borderRadius: 999,
        background: 'rgba(9, 13, 22, 0.72)',
        border: `1px solid ${TONE_COLOR[tone]}`,
        color: TONE_COLOR[tone],
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: '0.72rem',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      🏹 {text}
    </div>
  );
}
