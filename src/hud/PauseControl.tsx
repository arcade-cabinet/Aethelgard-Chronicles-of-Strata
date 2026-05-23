import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { useViewport } from '@/render/useViewport';
import { HUD_THEME } from './hud-theme';

/**
 * Pause / resume control (M_GAMEPLAY.7). A top-right pill button + the P key
 * toggle `game.paused`. While paused, `runEconomyTick` returns early so the
 * simulation freezes; rendering continues so the player can still inspect the
 * board. App-suspend on mobile auto-pauses.
 */
export function PauseControl({ game }: { game: GameState }) {
  const [paused, setPaused] = useState(game.paused);
  const viewport = useViewport();

  const toggle = useCallback(() => {
    game.paused = !game.paused;
    setPaused(game.paused);
  }, [game]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when typing in an input (seed-phrase field etc)
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        toggle();
      }
    };
    // mobile: pause when the app is backgrounded
    const onVisible = () => {
      if (document.hidden && !game.paused) toggle();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [game, toggle]);

  // narrower viewports stack the buttons closer to the right edge
  const rightPx = viewport.isPortrait ? 72 : 220;
  return (
    <div
      data-hud-panel
      style={{
        position: 'absolute',
        top: 12,
        right: rightPx,
        zIndex: 6,
        pointerEvents: 'auto',
      }}
    >
      <button
        type="button"
        id="pause-button"
        aria-label={paused ? 'Resume game' : 'Pause game'}
        onClick={toggle}
        style={{
          padding: '6px 14px',
          borderRadius: 999,
          background: paused ? HUD_THEME.color.accent : HUD_THEME.color.panel,
          color: paused ? '#000' : HUD_THEME.color.accent,
          border: `1px solid ${HUD_THEME.color.border}`,
          fontFamily: HUD_THEME.font.body,
          fontSize: '0.78rem',
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </button>
      {paused && (
        <div
          id="pause-banner"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '14px 26px',
            background: 'rgba(9,13,22,0.85)',
            border: `2px solid ${HUD_THEME.color.border}`,
            borderRadius: 12,
            color: HUD_THEME.color.gold,
            fontFamily: HUD_THEME.font.display,
            fontSize: '1.4rem',
            fontWeight: 700,
            letterSpacing: 2,
            pointerEvents: 'none',
          }}
        >
          PAUSED
        </div>
      )}
    </div>
  );
}
