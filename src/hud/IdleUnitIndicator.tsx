/**
 * M_HUD.SHELL.16c + M_GAME.MODE.PEON.3 — Idle Unit Indicator.
 *
 * Replacement for IdlePeonsIndicator that aligns with the RTS
 * commitment (docs/specs/200-genre-commitment.md):
 *
 * - Peons in `autoMode === 'auto'` are NEVER counted (by definition
 *   they're never idle — the auto scheduler always re-tasks them).
 *   Peons in `autoMode === 'manual'` ARE counted when their job is
 *   IDLE. (autoMode field is M_GAME.MODE.PEON.1 — not yet shipped;
 *   this indicator currently treats ALL peons as auto, i.e. zero
 *   peon counted. The first manual-mode peon will surface here as
 *   soon as PEON.1 lands.)
 * - Military units (Footman, Pikeman, Knight, Archer, etc — anything
 *   non-Peon) ARE always counted when their job is IDLE.
 *
 * Tap-to-cycle: clicking the chip cycles through the idle units in
 * world position order, dispatching `aethelgard:focus-tile` per tap
 * so the camera tweens (M_GAME.BUG.11) to the next idle unit. The
 * cycle wraps. Subsequent taps within 600ms advance; longer pauses
 * reset to the closest-to-camera idle unit.
 */
import { useRef, useState } from 'react';
import { AssignedJob, FactionTrait, HexPosition, PeonAutonomy, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './theme';
import './idle-peons-indicator.css';
import { useRafLoopThrottled } from './useRafLoop';

interface IdleEntry {
  q: number;
  r: number;
  unitType: string;
}

/** All idle player military + idle MANUAL-mode peons. */
function snapshotIdle(game: GameState): IdleEntry[] {
  const list: IdleEntry[] = [];
  for (const e of game.world.query(AssignedJob, Unit, FactionTrait, HexPosition)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(AssignedJob)?.state !== 'IDLE') continue;
    const unitType = e.get(Unit)?.unitType;
    if (!unitType) continue;
    // Peons: only count when in manual autoMode. PeonAutonomy
    // (M_GAME.MODE.PEON.1) lands the field; auto-mode peons are
    // never "idle" by definition (the auto-scheduler always
    // re-tasks them); manual-mode peons that just finished a task
    // surface here so the player can give them a new order.
    if (unitType === 'Peon') {
      const auto = e.get(PeonAutonomy);
      if (!auto || auto.autoMode === 'auto') continue;
    }
    const hex = e.get(HexPosition);
    if (!hex) continue;
    list.push({ q: hex.q, r: hex.r, unitType });
  }
  return list;
}

export function IdleUnitIndicator({ game }: { game: GameState }) {
  const [entries, setEntries] = useState<IdleEntry[]>([]);
  const cycleIdxRef = useRef(0);
  const lastTapRef = useRef(0);

  useRafLoopThrottled(
    () => {
      const next = snapshotIdle(game);
      setEntries((prev) => {
        if (
          next.length === prev.length &&
          next.every(
            (e, i) => e.q === prev[i]?.q && e.r === prev[i]?.r && e.unitType === prev[i]?.unitType,
          )
        ) {
          return prev;
        }
        return next;
      });
    },
    250,
    [game],
  );

  const count = entries.length;
  if (count <= 0) return null;

  const onTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current > 600) {
      cycleIdxRef.current = 0;
    } else {
      cycleIdxRef.current = (cycleIdxRef.current + 1) % entries.length;
    }
    lastTapRef.current = now;
    const target = entries[cycleIdxRef.current];
    if (target) {
      window.dispatchEvent(
        new CustomEvent('aethelgard:focus-tile', {
          detail: { q: target.q, r: target.r },
        }),
      );
    }
  };

  return (
    <button
      id="idle-units-indicator"
      type="button"
      onClick={onTap}
      aria-label={`${count} idle unit${count === 1 ? '' : 's'}. Tap to focus.`}
      data-testid="idle-units-indicator"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        background: 'rgba(245, 158, 11, 0.18)',
        border: '1px solid rgba(245, 158, 11, 0.55)',
        color: HUD_THEME.color.gold,
        fontFamily: HUD_THEME.font.body,
        fontSize: 13,
        fontWeight: 700,
        padding: '8px 14px',
        borderRadius: HUD_THEME.radius,
        cursor: 'pointer',
        minHeight: 44,
        pointerEvents: 'auto',
        animation: 'idle-peons-pulse 1.6s ease-in-out infinite',
      }}
    >
      ⚠ {count} idle unit{count === 1 ? '' : 's'}
    </button>
  );
}
