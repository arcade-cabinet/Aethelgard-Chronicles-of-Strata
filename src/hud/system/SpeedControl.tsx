import { useState } from 'react';
import type { GameState } from '@/game/game-state';
import { HudPill } from '../primitives';

/**
 * M_EXPANSION.U.111 — speed control. Cycles 1× → 2× → 4× → 1×.
 * Writes the chosen multiplier directly onto game.gameSpeed (used
 * by runEconomyTick to scale the wall-clock delta). Pause is owned
 * by PauseControl; this is orthogonal.
 */
const SPEEDS = [1, 2, 4] as const;

export function SpeedControl({ game }: { game: GameState }) {
  const [, force] = useState(0);
  const speed = game.gameSpeed ?? 1;
  const onClick = () => {
    const idx = SPEEDS.indexOf(speed as 1 | 2 | 4);
    const next = SPEEDS[(idx + 1) % SPEEDS.length] ?? 1;
    game.gameSpeed = next;
    force((n) => n + 1);
  };
  return (
    <HudPill
      slot="speed"
      id="speed-control"
      onClick={onClick}
      ariaLabel={`Game speed: ${speed}× (click to cycle)`}
      variant={speed === 1 ? 'default' : 'active'}
    >
      ⏩ {speed}×
    </HudPill>
  );
}
