import { useEffect, useState } from 'react';
import type { GameState } from '@/game/game-state';

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
 * on an animation frame so the counters track deposits live. Plain DOM; the
 * Radix-styled HUD arrives in M6.
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
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,
        display: 'flex',
        gap: 16,
        padding: '10px 16px',
        borderRadius: 12,
        background: 'rgba(9, 13, 22, 0.85)',
        color: '#f1f5f9',
        fontFamily: 'sans-serif',
        fontWeight: 700,
        fontSize: 14,
        pointerEvents: 'none',
      }}
    >
      {readouts.map((r) => (
        <span key={r.id} style={{ display: 'flex', gap: 6, alignItems: 'baseline' }}>
          <span style={{ color: r.color, fontSize: 11, textTransform: 'uppercase' }}>{r.label}</span>
          <span id={r.id}>{r.value}</span>
        </span>
      ))}
    </div>
  );
}

/** Read the current economy into display readouts. */
function snapshot(game: GameState): Readout[] {
  const e = game.economy;
  return [
    { id: 'val-wood', label: 'Wood', color: '#f97316', value: String(e.wood) },
    { id: 'val-stone', label: 'Stone', color: '#94a3b8', value: String(e.stone) },
    { id: 'val-gold', label: 'Gold', color: '#fbbf24', value: String(e.gold) },
    {
      id: 'val-supply',
      label: 'Supply',
      color: '#a855f7',
      value: `${e.usedSupply}/${e.maxSupply}`,
    },
  ];
}
