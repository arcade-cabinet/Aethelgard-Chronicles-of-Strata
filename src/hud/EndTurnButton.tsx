import { useEffect, useState } from 'react';
import { endTurn } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { useViewport } from '@/render/useViewport';
import { HUD_THEME } from './hud-theme';

/**
 * End-turn HUD button (M_MODES.8). Renders only when `game.turn` exists
 * (turn-based mode). Shows whose turn it is + a countdown of seconds
 * remaining; click ends the turn early.
 */
export function EndTurnButton({ game }: { game: GameState }) {
  const [, setTick] = useState(0);
  // re-render at ~10 Hz so the countdown ticks visibly without holding the
  // whole HUD in a continuous RAF loop.
  useEffect(() => {
    if (!game.turn) return;
    const id = setInterval(() => setTick((n) => (n + 1) & 0xffff), 100);
    return () => clearInterval(id);
  }, [game.turn]);
  const viewport = useViewport();
  if (!game.turn) return null;
  if (game.outcome !== 'playing') return null;
  const rightPx = viewport.isPortrait ? 8 : 580;
  const topPx = viewport.isPortrait ? 140 : 12;
  const isPlayer = game.turn.active === 'player';
  const secs = Math.max(0, Math.ceil(game.turn.secondsRemaining));
  return (
    <button
      type="button"
      id="end-turn-button"
      data-hud-panel
      aria-label="End the current turn"
      disabled={!isPlayer}
      onClick={() => endTurn(game)}
      style={{
        position: 'absolute',
        top: topPx,
        right: rightPx,
        zIndex: 6,
        padding: '6px 14px',
        borderRadius: 999,
        background: isPlayer ? HUD_THEME.blueGradient : 'rgba(0,0,0,0.4)',
        color: isPlayer ? '#fff' : HUD_THEME.color.muted,
        border: `1px solid ${HUD_THEME.color.border}`,
        fontFamily: HUD_THEME.font.body,
        fontSize: '0.72rem',
        fontWeight: 700,
        cursor: isPlayer ? 'pointer' : 'default',
        pointerEvents: 'auto',
      }}
    >
      {isPlayer ? `End turn · ${secs}s` : `Enemy turn · ${secs}s`}
    </button>
  );
}
