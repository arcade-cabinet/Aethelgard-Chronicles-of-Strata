import { useRef, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { useRafLoop } from '../useRafLoop';

/**
 * M_POLISH2.MODES.42b — strata-wars tile-flip red-pulse VFX.
 *
 * When a player-controlled tile flips to enemy (the zones.player
 * controlled-set shrinks), fire a brief screen-edge red pulse so the
 * player knows the realm has been encroached.
 *
 * Gated to strata-wars mode + playing — other modes get the standard
 * CriticalWarning red pulse only on base-HP-critical.
 *
 * Pulse duration: 600ms; opacity 0.0 → 0.35 → 0.0 (ease-in-out).
 */
const PULSE_MS = 600;

export function ZoneFlipPulse({ game }: { game: GameState }) {
  const [pulseUntilMs, setPulseUntilMs] = useState(0);
  const lastSizeRef = useRef<number>(game.zones?.player?.controlled?.size ?? 0);

  useRafLoop(() => {
    if (game.mode !== 'strata-wars') return;
    if (game.outcome !== 'playing') return;
    const cur = game.zones?.player?.controlled?.size ?? 0;
    const prev = lastSizeRef.current;
    if (cur < prev) {
      // Player lost a tile — fire pulse for PULSE_MS from now.
      setPulseUntilMs(performance.now() + PULSE_MS);
    }
    lastSizeRef.current = cur;
  }, [game]);

  const now = performance.now();
  const remaining = pulseUntilMs - now;
  if (remaining <= 0) return null;
  // Ease-in-out via a single sin curve.
  const t = 1 - remaining / PULSE_MS;
  const opacity = 0.35 * Math.sin(t * Math.PI);

  return (
    <div
      id="zone-flip-pulse"
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 95,
        boxShadow: `inset 0 0 90px 30px rgba(239, 68, 68, ${opacity})`,
      }}
    />
  );
}
