import { useState } from 'react';
import { Building, FactionTrait } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';
import { useRafLoop } from './useRafLoop';

/**
 * M_EXPANSION.S.58 — build queue strip (spec 90 §build queue).
 *
 * Shows the player's count of in-progress buildings as a small
 * pinned chip at the bottom-right. Hidden at zero — only surfaces
 * when there's something to track. Diffed per frame so the chip
 * re-renders only on count change.
 */
export function BuildQueueStrip({ game }: { game: GameState }) {
  const [count, setCount] = useState(0);

  useRafLoop(() => {
    let n = 0;
    for (const e of game.world.query(Building, FactionTrait)) {
      if (e.get(FactionTrait)?.faction !== 'player') continue;
      const b = e.get(Building);
      if (b && !b.isComplete) n += 1;
    }
    setCount((prev) => (prev === n ? prev : n));
  }, [game]);

  if (count <= 0) return null;
  return (
    <div
      id="build-queue-strip"
      role="status"
      aria-live="polite"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 16,
        background: HUD_THEME.color.panel,
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.body,
        fontSize: 12,
        fontWeight: 700,
        padding: '6px 12px',
        borderRadius: HUD_THEME.radius,
        pointerEvents: 'none',
      }}
    >
      🔨 {count} building{count === 1 ? '' : 's'}
    </div>
  );
}
