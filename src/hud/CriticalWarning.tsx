import { useState } from 'react';
import { duckMusic, restoreMusic } from '@/audio/buses';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import { FactionBase, Health } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
// M_AUDIT2.UX.33 — keyframes loaded once via CSS import; previously
// re-mounted as inline <style> on every render of this component.
import './critical-warning.css';
import { useRafLoop } from './useRafLoop';

/** Threshold below which the screen edges pulse red — base in critical danger. */
const CRITICAL_FRACTION = 0.3;

/**
 * Critical-base warning pulse (M_COMBAT_POLISH.5). When the PLAYER's
 * FactionBase HP falls below CRITICAL_FRACTION of its max, the screen
 * edges pulse with a red vignette so the player KNOWS the base is in
 * imminent danger. Pure presentation — drives off `Health` queries each
 * RAF; no game-state mutation.
 */
export function CriticalWarning({ game }: { game: GameState }) {
  const [critical, setCritical] = useState(false);

  useRafLoop(() => {
    // find the player base entity each frame (cheap — one entity)
    let frac = 1;
    for (const e of game.world.query(FactionBase, Health)) {
      if (e.get(FactionBase)?.faction !== 'player') continue;
      const hp = e.get(Health);
      if (hp && hp.max > 0) frac = hp.current / hp.max;
      break;
    }
    const isCritical = frac > 0 && frac < CRITICAL_FRACTION;
    setCritical((prev) => {
      // fire the alarm chime only on the transition false → true so it
      // doesn't spam every frame while the base is below threshold
      if (!prev && isCritical) {
        emitUiSound('critical-alarm');
        // M_EXPANSION.AU.41 — duck music to 40% so the alarm cuts
        // through. Restored on the true→false edge below.
        duckMusic();
        // M_AUDIT2.UX.12 — SR announcement comes from the rendered
        // role="alert" div mounting (auto-announces on insert).
        // The previous announce() bus call would double-fire because
        // the rendered div ALSO triggers SR speech — reviewer flagged.
      }
      if (prev && !isCritical) restoreMusic();
      return prev === isCritical ? prev : isCritical;
    });
  }, [game]);

  if (!critical) return null;
  return (
    <div
      id="critical-warning"
      // M_AUDIT2.UX.26 — was aria-hidden=true (hid the alarm from SR).
      // role=alert + aria-live=assertive auto-announces the visually-
      // hidden span on mount.
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 50,
        boxShadow: 'inset 0 0 120px 30px rgba(239, 68, 68, 0.6)',
        animation: 'critical-pulse 1.2s ease-in-out infinite',
      }}
    >
      <span
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0,0,0,0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Your base is under attack — critical health
      </span>
    </div>
  );
}
