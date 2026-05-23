import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { RESOURCE_TYPES, type ResourceType } from '@/ecs/components';
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
 * `compact` tightens spacing and type for narrow (phone-portrait) viewports.
 */
export function ResourceBar({ game, compact = false }: { game: GameState; compact?: boolean }) {
  const [readouts, setReadouts] = useState<Readout[]>(() => snapshot(game));

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      // Diff snapshot vs previous — skip the setState (and React reconcile)
      // when readouts are unchanged. Resource totals only change on harvest/
      // spend/training, not every frame. CodeRabbit-flagged: unconditional
      // setState every RAF was a 60Hz waste.
      setReadouts((prev) => {
        const next = snapshot(game);
        if (
          next.length === prev.length &&
          next.every((r, i) => r.value === prev[i]?.value && r.id === prev[i]?.id)
        ) {
          return prev;
        }
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game]);

  return (
    <motion.div
      id="resource-bar"
      role="region"
      aria-label="Resource totals"
      initial={{ x: -40, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'absolute',
        top: compact ? 8 : 16,
        left: compact ? 8 : 16,
        display: 'flex',
        gap: compact ? 9 : 16,
        padding: compact ? '6px 10px' : '10px 16px',
        borderRadius: HUD_THEME.radius,
        background: HUD_THEME.color.panel,
        border: `1px solid ${HUD_THEME.color.border}`,
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        fontSize: compact ? 12 : 14,
        pointerEvents: 'none',
      }}
    >
      {readouts.map((r) => (
        <span key={r.id} style={{ display: 'flex', gap: compact ? 4 : 6, alignItems: 'baseline' }}>
          <span style={{ color: r.color, fontSize: compact ? 9 : 11, textTransform: 'uppercase' }}>
            {r.label}
          </span>
          <span id={r.id}>{r.value}</span>
        </span>
      ))}
    </motion.div>
  );
}

/** Display config per resource slot — label, theme color, HUD id. */
const SLOT_DISPLAY: Record<ResourceType, { label: string; color: string; id: string }> = {
  wood: { label: 'Wood', color: HUD_THEME.color.wood, id: 'val-wood' },
  stone: { label: 'Stone', color: HUD_THEME.color.stone, id: 'val-stone' },
  gold: { label: 'Gold', color: HUD_THEME.color.coin, id: 'val-gold' },
  science: { label: 'Science', color: HUD_THEME.color.accent, id: 'val-science' },
};

/**
 * Snapshot the economy into HUD readouts. Slot-iterating: adding a 4th slot
 * means one row in SLOT_DISPLAY + one entry in RESOURCE_TYPES; no code change
 * here. Supply is non-slot (separate counter), shown last.
 */
function snapshot(game: GameState): Readout[] {
  const e = game.economy.player;
  const rows: Readout[] = [];
  for (const slot of RESOURCE_TYPES) {
    const d = SLOT_DISPLAY[slot];
    if (!d) continue;
    rows.push({ id: d.id, label: d.label, color: d.color, value: String(e[slot]) });
  }
  rows.push({
    id: 'val-supply',
    label: 'Supply',
    color: HUD_THEME.color.supply,
    value: `${e.usedSupply}/${e.maxSupply}`,
  });
  return rows;
}
