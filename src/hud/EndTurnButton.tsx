import { useEffect, useRef, useState } from 'react';
import { endTurn } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { useViewport } from '@/render/useViewport';
import { formatTime } from './format';
import { HUD_THEME } from './hud-theme';

/**
 * End-turn HUD button (M_MODES.8). Renders only when `game.turn` exists
 * (turn-based mode). Shows whose turn it is + a countdown of seconds
 * remaining; click ends the turn early.
 */
export function EndTurnButton({ game }: { game: GameState }) {
  const [, setTick] = useState(0);
  // M_AUDIT2.UX.40 — re-render only when the DISPLAYED integer would
  // change, not every 100 ms. lastDisplayedRef tracks the last whole-
  // second value we painted; we still poll at 100 ms (responsiveness)
  // but skip setState when the visible text is unchanged.
  const lastDisplayedRef = useRef<number>(-1);
  useEffect(() => {
    if (!game.turn) return;
    const id = setInterval(() => {
      const turn = game.turn;
      if (!turn) return;
      const displayed = Math.max(0, Math.ceil(turn.secondsRemaining));
      if (displayed === lastDisplayedRef.current) return;
      lastDisplayedRef.current = displayed;
      setTick((n) => (n + 1) & 0xffff);
    }, 100);
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
      {/* M_AUDIT2.UX.11 — formatTime keeps MM:SS for long turns. */}
      {isPlayer ? `End turn · ${formatTime(secs)}` : `Enemy turn · ${formatTime(secs)}`}
    </button>
  );
}
