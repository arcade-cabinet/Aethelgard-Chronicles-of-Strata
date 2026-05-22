import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';

/** One resource readout. */
interface Readout {
  /** DOM id for the value span (used by tests). */
  id: string;
  /** Short label. */
  label: string;
  /** Accent color. */
  color: string;
  /** Current display text. */
  value: string;
}

/**
 * The HUD resource bar — wood, stone, gold, and supply. Polls `game.economy`
 * on an animation frame so the counters track deposits live. Themed with the
 * obsidian/gold HUD palette; slides in from the left on mount (framer-motion).
 */
export function ResourceBar({ game }: { game: GameState }) {
  const [readouts, setReadouts] = useState<Readout[]>(() => snapshot(game));

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setReadouts(snapshot(game));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return (
    <motion.div
      id="resource-bar"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        display: 'flex',
        gap: 16,
        padding: '10px 16px',
        borderRadius: HUD_THEME.radius,
        background: HUD_THEME.color.panel,
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: 14,
        pointerEvents: 'none',
      }}
    >
      {readouts.map((r) => (
        <span key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ color: r.color, fontSize: 11, textTransform: 'uppercase' }}>
            {r.label}
          </span>
          <span id={r.id}>{r.value}</span>
        </span>
      ))}
    </motion.div>
  );
}

/** Read the current economy into display readouts. */
function snapshot(game: GameState): Readout[] {
  const e = game.economy;
  return [
    { id: 'val-wood', label: 'Wood', color: HUD_THEME.color.wood, value: String(e.wood) },
    { id: 'val-stone', label: 'Stone', color: HUD_THEME.color.stone, value: String(e.stone) },
    { id: 'val-gold', label: 'Gold', color: HUD_THEME.color.coin, value: String(e.gold) },
    {
      id: 'val-supply',
      label: 'Supply',
      color: HUD_THEME.color.supply,
      value: `${e.usedSupply}/${e.maxSupply}`,
    },
  ];
}
