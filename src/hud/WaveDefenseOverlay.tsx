/**
 * M_V11.WAVE-DEFENSE (#77h) — wave-progress pill.
 *
 * Top-right pill (matches existing WinConditionPill style) shows the
 * active wave + total + a brief countdown until the next wave.
 * Renders only when game.mode === 'wave-defense'.
 */
import { useEffect, useState } from 'react';
import { waveDefenseProgress } from '@/ecs/systems/wave-defense';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';

export interface WaveDefenseOverlayProps {
  game: GameState;
}

const POLL_INTERVAL_MS = 500;

export function WaveDefenseOverlay({ game }: WaveDefenseOverlayProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (game.mode !== 'wave-defense') return;
    const interval = setInterval(() => setTick((t) => t + 1), POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [game.mode]);

  if (game.mode !== 'wave-defense') return null;
  const { wave, total } = waveDefenseProgress(game);
  const isComplete = wave >= total;
  return (
    <aside
      id="wave-defense-overlay"
      aria-label="Wave defense progress"
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-top) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        background: HUD_THEME.color.panel,
        border: `2px solid ${
          isComplete ? (HUD_THEME.color.gold ?? '#e4b54b') : HUD_THEME.color.accent
        }`,
        borderRadius: 999,
        padding: '6px 16px',
        color: HUD_THEME.color.text,
        fontSize: 14,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        zIndex: 150,
      }}
    >
      {isComplete
        ? `✓ All ${total} waves cleared — defend until victory toast`
        : `🛡 Wave ${wave} / ${total}`}
    </aside>
  );
}
