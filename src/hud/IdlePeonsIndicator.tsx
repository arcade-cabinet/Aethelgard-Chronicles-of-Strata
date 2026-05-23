import { useState } from 'react';
import { AssignedJob, FactionTrait, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';
// Reviewer-fix: keyframes loaded once via CSS import; previously inline.
import './idle-peons-indicator.css';
import { useRafLoopThrottled } from './useRafLoop';

/**
 * M_AUDIT2.UX.13 — idle-peon HUD log strip.
 *
 * Polls the player's peon population each frame and surfaces a
 * pulsing yellow chip when ≥1 peon is sitting IDLE so the player
 * can dispatch them to a job. Hidden when zero (no noise during
 * the steady state where every peon is harvesting / building).
 *
 * Click handler is a no-op for now — a future patch will use it to
 * pan the camera to the nearest idle peon. The chip itself reads
 * accessibly via aria-live="polite" so SR users hear the count
 * when it changes.
 *
 * The full "peon billboard" (3D "?" floating above an idle peon)
 * is intentionally deferred to a per-entity hover overlay — the
 * count chip is the high-value, low-cost first slice.
 */
export function IdlePeonsIndicator({ game }: { game: GameState }) {
  const [count, setCount] = useState(0);

  // M_EXPANSION.D.177 — 4Hz throttle; idle count changes seconds-apart.
  useRafLoopThrottled(
    () => {
      let n = 0;
      for (const e of game.world.query(AssignedJob, Unit, FactionTrait)) {
        if (e.get(FactionTrait)?.faction !== 'player') continue;
        if (e.get(Unit)?.unitType !== 'Peon') continue;
        if (e.get(AssignedJob)?.state === 'IDLE') n += 1;
      }
      setCount((prev) => (prev === n ? prev : n));
    },
    250,
    [game],
  );

  if (count <= 0) return null;
  return (
    <div
      id="idle-peons"
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        background: 'rgba(245, 158, 11, 0.18)', // warm amber
        border: '1px solid rgba(245, 158, 11, 0.55)',
        color: HUD_THEME.color.gold,
        fontFamily: HUD_THEME.font.body,
        fontSize: 13,
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: HUD_THEME.radius,
        pointerEvents: 'none',
        animation: 'idle-peons-pulse 1.6s ease-in-out infinite',
      }}
    >
      ⚠ {count} idle peon{count === 1 ? '' : 's'}
    </div>
  );
}
