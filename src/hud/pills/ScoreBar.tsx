import { useState } from 'react';
import type { GameState } from '@/game/game-state';
import { formatInt } from '../theme';
import { HUD_THEME } from '../theme';
import { useRafLoop } from '../useRafLoop';

/**
 * M_EXPANSION.U.105 — top-centre live score bar.
 *
 * Reads game.score per frame; diffs the rounded integer score before
 * setState so a steady-state idle game doesn't churn reconcile. Two
 * chips side by side — player (blue) vs enemy (red).
 */
export function ScoreBar({ game }: { game: GameState }) {
  const [scores, setScores] = useState({ player: 0, enemy: 0 });

  useRafLoop(() => {
    const next = {
      player: Math.round(game.score.player),
      enemy: Math.round(game.score.enemy),
    };
    setScores((prev) => (prev.player === next.player && prev.enemy === next.enemy ? prev : next));
  }, [game]);

  return (
    <section
      id="score-bar"
      aria-label="Match score"
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 10,
        padding: '6px 14px',
        borderRadius: HUD_THEME.radius,
        background: HUD_THEME.color.panel,
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.body,
        fontSize: 13,
        fontWeight: 700,
        pointerEvents: 'none',
      }}
    >
      <span style={{ color: '#38bdf8' }} title={`Player score ${scores.player}`}>
        {formatInt(scores.player)}
      </span>
      <span style={{ color: HUD_THEME.color.muted }}>vs</span>
      <span style={{ color: '#f43f5e' }} title={`Enemy score ${scores.enemy}`}>
        {formatInt(scores.enemy)}
      </span>
    </section>
  );
}
