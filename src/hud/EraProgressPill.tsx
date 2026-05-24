import { useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { eraForScience, eraProgressFraction, scienceToNextEra } from '@/rules/eras';
import { HUD_THEME } from './hud-theme';

/**
 * M_POLISH2.MODES.43 + X4.27 — era progression pill for age-of-strata.
 *
 * Surfaces:
 *   - Current era (Stone / Bronze / Iron / Renaissance)
 *   - Progress bar within the era band
 *   - Science-to-next-era count, hidden when at the final era
 *
 * Visible only in age-of-strata mode + while playing.
 * Top-centre at top:40 (next to other mode-specific pills).
 */
export function EraProgressPill({ game }: { game: GameState }) {
  const [science, setScience] = useState(() => game.economy?.player?.science ?? 0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setScience(game.economy?.player?.science ?? 0);
    }, 600);
    return () => window.clearInterval(id);
  }, [game]);

  if (game.mode !== 'age-of-strata') return null;
  if (game.outcome !== 'playing') return null;

  const era = eraForScience(science);
  const fraction = eraProgressFraction(science);
  const toNext = scienceToNextEra(science);
  const isFinal = toNext === 0 && era === 'Renaissance';

  return (
    <div
      id="era-progress-pill"
      role="status"
      aria-label={`Era: ${era}${isFinal ? '' : `, ${toNext} science to next era`}`}
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 40px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 89,
        padding: '4px 14px',
        borderRadius: 999,
        background: 'rgba(9, 13, 22, 0.78)',
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.gold,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: '0.75rem',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>📜 {era}</span>
      {/* Compact progress bar */}
      <span
        style={{
          width: 60,
          height: 4,
          background: 'rgba(56,189,248,0.18)',
          borderRadius: 2,
          overflow: 'hidden',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${fraction * 100}%`,
            height: '100%',
            background: HUD_THEME.color.accent,
          }}
        />
      </span>
      <span
        style={{
          color: HUD_THEME.color.muted,
          fontVariantNumeric: 'tabular-nums',
          fontSize: '0.7rem',
        }}
      >
        {isFinal ? 'max' : `${toNext}🔬`}
      </span>
    </div>
  );
}
