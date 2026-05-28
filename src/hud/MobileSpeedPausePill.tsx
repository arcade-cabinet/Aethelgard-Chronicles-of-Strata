import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './theme';

/**
 * M_POLISH2.MOBILE.14 — unified Speed + Pause pill for portrait
 * mobile. Replaces two separate floating chips that compete for
 * the same top-right slot.
 *
 * Layout: `[⏸ | 1× | 2× | 3×]` — four segments, the active one
 * highlighted. Tapping ⏸ toggles pause; tapping a speed segment
 * sets that speed (and unpauses if paused). Visible-but-pressed
 * state via aria-pressed.
 *
 * Compact: 36px tall, 44px per segment to meet the 44×44 minimum
 * touch target. Inset-bottom-aware so it sits above the home-bar.
 *
 * Desktop keeps the original SpeedControl + PauseControl pair.
 */
const SPEEDS = [1, 2, 3] as const;

export function MobileSpeedPausePill({ game }: { game: GameState }) {
  const [paused, setPaused] = useState(game.paused);
  const [speed, setSpeed] = useState(game.gameSpeed ?? 1);

  // Re-sync if the underlying state changes via keyboard (P) or
  // visibilitychange (background → pause). Cheap interval poll —
  // a useFrame here would couple this to r3f.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (game.paused !== paused) setPaused(game.paused);
      if ((game.gameSpeed ?? 1) !== speed) setSpeed(game.gameSpeed ?? 1);
    }, 200);
    return () => window.clearInterval(id);
  }, [game, paused, speed]);

  const togglePause = useCallback(() => {
    game.paused = !game.paused;
    setPaused(game.paused);
  }, [game]);

  const setSpeedNow = useCallback(
    (next: 1 | 2 | 3) => {
      game.gameSpeed = next;
      // Tapping a speed also resumes (matches user intent — they
      // wouldn't tap 2× while wanting to stay paused).
      if (game.paused) {
        game.paused = false;
        setPaused(false);
      }
      setSpeed(next);
    },
    [game],
  );

  return (
    <fieldset
      id="mobile-speed-pause-pill"
      aria-label="Game speed and pause"
      style={{
        position: 'fixed',
        top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 8px)',
        zIndex: 100,
        display: 'flex',
        height: 36,
        borderRadius: 18,
        background: HUD_THEME.color.panel,
        border: `1px solid ${HUD_THEME.color.border}`,
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        margin: 0,
        padding: 0,
        minInlineSize: 'auto', // override fieldset default min-width
      }}
    >
      <button
        type="button"
        id="mobile-pause"
        aria-pressed={paused}
        aria-label={paused ? 'Resume game' : 'Pause game'}
        onClick={togglePause}
        style={{
          width: 44,
          border: 'none',
          background: paused ? HUD_THEME.color.accent : 'transparent',
          color: paused ? HUD_THEME.color.obsidian : HUD_THEME.color.text,
          fontWeight: 700,
          cursor: 'pointer',
          fontSize: 16,
        }}
      >
        {paused ? '▶' : '⏸'}
      </button>
      {SPEEDS.map((s) => {
        const active = !paused && speed === s;
        return (
          <button
            key={s}
            type="button"
            id={`mobile-speed-${s}x`}
            aria-pressed={active}
            aria-label={`Set game speed ${s} times`}
            onClick={() => setSpeedNow(s)}
            style={{
              width: 44,
              border: 'none',
              borderLeft: `1px solid ${HUD_THEME.color.border}`,
              background: active ? HUD_THEME.color.accent : 'transparent',
              color: active ? HUD_THEME.color.obsidian : HUD_THEME.color.muted,
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: 13,
              fontFamily: HUD_THEME.font.body,
            }}
          >
            {s}×
          </button>
        );
      })}
    </fieldset>
  );
}
