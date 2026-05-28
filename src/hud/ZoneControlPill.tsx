import { useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './theme';

/**
 * M_POLISH2.MODES.42 — strata-wars zone-control percent chip.
 *
 * Strata-wars is the puzzle-strategy / zone-of-control variant.
 * The mode's load-bearing UX is "what percent of the realm do I
 * currently control?" — this chip surfaces that answer at-a-glance.
 *
 * Visible only in strata-wars mode + while playing. Top-centre at
 * top:40 (next to the other mode-specific pills).
 *
 * Tone-coded:
 *   < 25%   red (losing)
 *   25..50% gold (contested)
 *   50..75% accent (winning)
 *   ≥ 75%   green (dominant — close to the 80%-for-30s mode-win)
 */
function toneFor(pct: number): string {
  if (pct < 25) return HUD_THEME.color.danger;
  if (pct < 50) return HUD_THEME.color.gold;
  if (pct < 75) return HUD_THEME.color.accent;
  return '#22c55e';
}

export function ZoneControlPill({ game }: { game: GameState }) {
  const [pct, setPct] = useState(() => computePct(game));

  useEffect(() => {
    const id = window.setInterval(() => {
      setPct(computePct(game));
    }, 600);
    return () => window.clearInterval(id);
  }, [game]);

  if (game.mode !== 'strata-wars') return null;
  if (game.outcome !== 'playing') return null;

  const tone = toneFor(pct);

  return (
    <div
      id="zone-control-pill"
      role="status"
      aria-label={`Zone control: ${pct} percent`}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 40px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 89,
        padding: '4px 14px',
        borderRadius: 999,
        background: 'rgba(9, 13, 22, 0.72)',
        border: `1px solid ${tone}`,
        color: tone,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: '0.75rem',
        fontVariantNumeric: 'tabular-nums',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      🛡 {pct}%
    </div>
  );
}

function computePct(game: GameState): number {
  const player = game.zones?.player?.controlled?.size ?? 0;
  const enemy = game.zones?.enemy?.controlled?.size ?? 0;
  const total = player + enemy;
  if (total === 0) return 0;
  return Math.round((player / total) * 100);
}
