import { useCallback, useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { HudPill } from './HudPill';
import { HUD_THEME } from './theme';

/**
 * Pause / resume control (M_GAMEPLAY.7). A top-right pill button + the P key
 * toggle `game.paused`. While paused, `runEconomyTick` returns early so the
 * simulation freezes; rendering continues so the player can still inspect the
 * board. App-suspend on mobile auto-pauses.
 */
export function PauseControl({ game }: { game: GameState }) {
  const [paused, setPaused] = useState(game.paused);

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

  return (
    <>
      {/* M_MICRO.10.2 — HudPill picks (top, right) from its slot table;
          `active` variant inverts on pause. */}
      <HudPill
        slot="pause"
        id="pause-button"
        ariaLabel={paused ? 'Resume game' : 'Pause game'}
        onClick={toggle}
        variant={paused ? 'active' : 'default'}
      >
        {paused ? '▶ Resume' : '⏸ Pause'}
      </HudPill>
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
    </>
  );
}
