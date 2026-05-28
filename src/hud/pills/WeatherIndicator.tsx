import { useState } from 'react';
import type { GameState } from '@/game/game-state';
import { WEATHER_PROFILES, type WeatherState } from '@/game/weather';
import { announce } from '../aria-live-bus';
import { HudPill } from '../primitives';
import { useRafLoopThrottled } from '../useRafLoop';

/**
 * M_AUDIT2.UX.15 — weather indicator pill.
 *
 * Polls `game.weather.state` per frame; on a state change rerenders
 * the pill AND announces the new weather via the aria-live bus so
 * blind / low-vision players know rain just slowed their army.
 *
 * No click target — weather is purely informational. Tooltip on
 * hover shows the active speedMultiplier ("☔ Heavy Rain — 80% move
 * speed") so a sighted player gets the same context.
 */
export function WeatherIndicator({ game }: { game: GameState }) {
  const [state, setState] = useState<WeatherState>(game.weather.state);

  // M_EXPANSION.D.178 — 4Hz throttle; weather flips every ~minute.
  useRafLoopThrottled(
    () => {
      const next = game.weather.state;
      setState((prev) => {
        if (prev !== next) {
          // M_AUDIT2.UX.15 — announce on the edge.
          announce(`Weather changed: ${WEATHER_PROFILES[next].label}`);
        }
        return prev === next ? prev : next;
      });
    },
    250,
    [game],
  );

  const profile = WEATHER_PROFILES[state];
  const movePct = Math.round(profile.speedMultiplier * 100);
  return (
    <HudPill
      slot="weather"
      id="weather-indicator"
      ariaLabel={`Weather: ${profile.label}, movement ${movePct}%`}
    >
      <span title={`${profile.label} — ${movePct}% move speed`}>{profile.label}</span>
    </HudPill>
  );
}
