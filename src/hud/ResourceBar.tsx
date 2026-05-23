import { motion } from 'framer-motion';
import { useState } from 'react';
import { RESOURCE_TYPES } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { resourceDisplayFor } from '@/rules';
import { formatInt } from './format';
import { HUD_THEME } from './hud-theme';
import { useRafLoop } from './useRafLoop';

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

  useRafLoop(() => {
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

/**
 * Snapshot the economy into HUD readouts. Slot-iterating via the
 * unified RESOURCE_DISPLAY registry (M_AUDIT2.ARCH.2): adding a 4th
 * slot is ONE row in rules/display.ts + ONE entry in RESOURCE_TYPES;
 * no code change here. Supply is non-slot (separate counter), shown last.
 */
function snapshot(game: GameState): Readout[] {
  const e = game.economy.player;
  const rows: Readout[] = [];
  for (const slot of RESOURCE_TYPES) {
    const d = resourceDisplayFor(slot);
    // M_AUDIT2.UX.10 — locale-formatted with thousands separator.
    rows.push({ id: d.domId, label: d.label, color: d.color, value: formatInt(e[slot]) });
  }
  // M_AUDIT2.UX.14 — supply-cap nag. When the player hits cap, the
  // value flashes danger-red + appends "(cap)" so they know why Train
  // buttons grey out. Without this the player tries to train, the
  // button does nothing, and there's no inline signal.
  const atCap = e.usedSupply >= e.maxSupply;
  const supplyLabel = atCap
    ? `${e.usedSupply}/${e.maxSupply} (cap)`
    : `${e.usedSupply}/${e.maxSupply}`;
  rows.push({
    id: 'val-supply',
    label: 'Supply',
    color: atCap ? HUD_THEME.color.danger : HUD_THEME.color.supply,
    value: supplyLabel,
  });
  return rows;
}
