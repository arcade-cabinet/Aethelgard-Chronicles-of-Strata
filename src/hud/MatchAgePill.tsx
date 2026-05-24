import { useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';

/**
 * M_POLISH2.MODES.41 — long-reign match-age chip.
 *
 * Visible only in long-reign mode + while playing. Surfaces the
 * elapsed game-time as MM:SS so the player has a sense of how
 * long they've survived in the endless attrition mode (the
 * narrative anchor of the mode is "I've lasted X minutes").
 *
 * Top-centre under any other pills (top:72 to clear WinConditionPill
 * at top:8 and any other mode-pill at top:40).
 */
function fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${mm}:${ss.toString().padStart(2, '0')}`;
}

export function MatchAgePill({ game }: { game: GameState }) {
  const [elapsed, setElapsed] = useState(game.clock?.elapsed ?? 0);

  useEffect(() => {
    // 1s tick — match-age display is per-second.
    const id = window.setInterval(() => {
      setElapsed(game.clock?.elapsed ?? 0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [game]);

  if (game.mode !== 'long-reign') return null;
  if (game.outcome !== 'playing') return null;

  return (
    <div
      id="match-age-pill"
      role="status"
      aria-label={`Match age: ${fmtTime(elapsed)}`}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 40px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 89,
        padding: '4px 14px',
        borderRadius: 999,
        background: 'rgba(9, 13, 22, 0.72)',
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.gold,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      ⏳ {fmtTime(elapsed)}
    </div>
  );
}
