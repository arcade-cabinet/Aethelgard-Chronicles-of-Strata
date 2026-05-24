import { useRef, useState } from 'react';
import { CylinderGeometry } from 'three';
import { HEX_RADIUS, TILE_HEIGHT } from '@/config/world';
import { axialToWorld, getHexKey, hexNeighbors } from '@/core/hex';
import { Building, FactionTrait, Selectable, Unit } from '@/ecs/components';
import {
  findSelectableAtTile,
  moveUnit,
  placeBuilding,
  planMoveOrder,
  setRally,
} from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { selectEntity, selectedEntities } from '@/game/selection';
import { PathLine } from './PathLine';

/** Long-press threshold (ms) — touch hold beyond this fires as right-click. */
const LONG_PRESS_MS = 500;

/**
 * Per-tile invisible pick collider. Routes mouse left/right OR touch tap/
 * long-press to the parent's left/right callbacks (M_GAMEPLAY.3).
 */
function TilePick({
  x,
  y,
  z,
  onLeft,
  onRight,
  onHover,
}: {
  x: number;
  y: number;
  z: number;
  onLeft: () => void;
  onRight: () => void;
  /** M_EXPANSION.U.108 — fires on pointer-over; null on leave. */
  onHover?: () => void;
}) {
  const longPressRef = useRef<{ timer: number; fired: boolean } | null>(null);
  return (
    // <mesh> is an r3f three.js node, not a DOM element — the a11y
    // rule misfires on the JSX intrinsic. Suppress here so the broader
    // override (M_AUDIT2.SEC2.50) doesn't have to re-blanket the file.
    // biome-ignore lint/a11y/noStaticElementInteractions: r3f mesh, not DOM
    <mesh
      position={[x, y, z]}
      rotation={[0, Math.PI / 6, 0]}
      geometry={pickGeometry}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover?.();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        const ne = e.nativeEvent as PointerEvent;
        // mouse right-click → fire right immediately
        if (ne.pointerType !== 'touch' && ne.button === 2) {
          onRight();
          return;
        }
        // touch: arm a long-press timer; release before threshold = left.
        if (ne.pointerType === 'touch') {
          const state = { timer: 0, fired: false };
          state.timer = window.setTimeout(() => {
            state.fired = true;
            onRight();
          }, LONG_PRESS_MS);
          longPressRef.current = state;
          return;
        }
        onLeft();
      }}
      onPointerUp={(e) => {
        const ne = e.nativeEvent as PointerEvent;
        if (ne.pointerType !== 'touch') return;
        const state = longPressRef.current;
        if (!state) return;
        clearTimeout(state.timer);
        longPressRef.current = null;
        if (!state.fired) onLeft();
      }}
      onPointerLeave={() => {
        const state = longPressRef.current;
        if (state) {
          clearTimeout(state.timer);
          longPressRef.current = null;
        }
      }}
      onContextMenu={(e) => {
        e.nativeEvent.preventDefault();
      }}
    >
      <meshBasicMaterial visible={false} />
    </mesh>
  );
}

// M_REGISTRY.17 — MILITARY unified into UNIT_PROFILES.combatRole.
import { MILITARY_ROLES as MILITARY } from '@/rules/unit-profiles';

const pickGeometry = new CylinderGeometry(HEX_RADIUS * 0.95, HEX_RADIUS * 0.95, 0.2, 6);

/**
 * Active build context passed from outside when the player has chosen a
 * building to place. `null` means no build in progress.
 */
export interface BuildContext {
  /** Building type selected to place. */
  type: Exclude<import('@/ecs/components').BuildingType, 'TownHall'>;
  /** Callback to invoke after placement (clears the build context). */
  onPlaced: () => void;
}

// no-visual-impact: TileInteraction renders only invisible pick colliders — routing logic change has no visible output
/**
 * Invisible per-tile pick colliders. Click routing by context:
 *
 * 1. If a unit/building is on the clicked tile → select it.
 * 2. Else if `buildContext` is set → place the chosen building and clear the
 *    context via `onPlaced()`.
 * 3. Else if the selected entity is a Barracks → set the rally point.
 * 4. Else → issue a move order for the player pawn.
 */
export function TileInteraction({
  game,
  buildContext = null,
  spawnTrackingRing,
}: {
  game: GameState;
  buildContext?: BuildContext | null;
  /** Optional callback to drop a tracking ring at a tile — M_GAMEPLAY.5. */
  spawnTrackingRing?: (q: number, r: number) => void;
}) {
  const [pathKeys, setPathKeys] = useState<string[]>([]);
  // M_EXPANSION.U.108 — hovered tile (q,r) for the build-mode ghost.
  const [hoveredTile, setHoveredTile] = useState<{ q: number; r: number; level: number } | null>(
    null,
  );
  // M_AUDIT2.SEC2.26 — 100ms click cooldown. Auto-clickers can chain
  // build placements faster than the economy tick can validate (multiple
  // resource-spends before any tick runs). 100ms is invisible to humans.
  const lastClickMsRef = useRef<number>(0);
  const tiles = [...game.board.tiles.values()].filter((t) => t.walkable);

  /**
   * Right-click / context menu (M_GAMEPLAY.3): if the player has military
   * units selected, route them toward the target tile via `moveUnit`. Peons
   * are explicitly excluded — they remain autonomous (spec 101). Flocking-
   * style ring offsets distribute units around the target so they don't
   * stack on the same hex (offset by tile neighbours).
   */
  const onRightPick = (q: number, r: number): void => {
    const targetKey = getHexKey(q, r);
    const military = selectedEntities(game).filter((e) => {
      const role = e.get(Unit)?.unitType;
      return role && MILITARY.has(role) && e.get(FactionTrait)?.faction === 'player';
    });
    if (military.length === 0) return;
    // For each military unit, target the nearest free neighbour of the target
    // tile (so the army flocks around it rather than stacking on it).
    const neighbours = [targetKey, ...hexNeighbors(q, r)];
    military.forEach((unit, i) => {
      const dest = neighbours[i % neighbours.length] ?? targetKey;
      moveUnit(game, unit, dest, 'player');
    });
    setPathKeys([]);
    // M_GAMEPLAY.5 — drop a tracking-ring at the destination as feedback.
    spawnTrackingRing?.(q, r);
  };

  const onPick = (q: number, r: number): void => {
    // performance.now() is allowed here — render-layer code, not sim.
    const now = performance.now();
    if (now - lastClickMsRef.current < 100) return;
    lastClickMsRef.current = now;
    const tileKey = getHexKey(q, r);

    // Priority 1: select a unit or building on the tile.
    const selectable = findSelectableAtTile(game, tileKey);
    if (selectable) {
      selectEntity(game, selectable);
      setPathKeys([]);
      return;
    }

    // Priority 2: place a building if build context is active.
    if (buildContext) {
      placeBuilding(game, tileKey, buildContext.type);
      buildContext.onPlaced();
      setPathKeys([]);
      return;
    }

    // Priority 3: set rally point when the Barracks is selected.
    if (game.selectedId !== undefined) {
      for (const entity of game.world.query(Selectable, Building)) {
        const sel = entity.get(Selectable);
        const bld = entity.get(Building);
        if (sel?.isSelected && bld?.buildingType === 'Barracks') {
          setRally(game, tileKey);
          setPathKeys([]);
          return;
        }
      }
    }

    // Priority 4: move order for the player pawn.
    const path = planMoveOrder(game, tileKey);
    if (path) setPathKeys(path);
  };

  return (
    <>
      <PathLine game={game} pathKeys={pathKeys} />
      {tiles.map((t) => {
        const { x, z } = axialToWorld(t.q, t.r);
        return (
          <TilePick
            key={`pick-${t.q},${t.r}`}
            x={x}
            y={t.level * TILE_HEIGHT + 0.1}
            z={z}
            onLeft={() => onPick(t.q, t.r)}
            onRight={() => onRightPick(t.q, t.r)}
            onHover={() => setHoveredTile({ q: t.q, r: t.r, level: t.level })}
          />
        );
      })}
      {/*
        M_EXPANSION.U.108 — build-mode ghost. Translucent disc at the
        hovered tile while a build context is active; lets the player
        see "would this fit here" before clicking.
      */}
      {buildContext && hoveredTile && <BuildGhost tile={hoveredTile} />}
    </>
  );
}

/**
 * M_EXPANSION.U.108 — translucent build-mode ghost. A cyan disc the
 * size of one hex, hovering 0.05 above tile level, with 40% opacity
 * so the underlying terrain colour still reads. Lets the player see
 * "would the next click place a building HERE?" without any mesh
 * load for the building type itself (a full-fidelity ghost would
 * need a useGLTF per building type — overkill for first pass).
 */
const ghostGeo = new CylinderGeometry(HEX_RADIUS * 0.9, HEX_RADIUS * 0.9, 0.08, 6, 1, false);
function BuildGhost({ tile }: { tile: { q: number; r: number; level: number } }) {
  const { x, z } = axialToWorld(tile.q, tile.r);
  return (
    <mesh
      position={[x, tile.level * TILE_HEIGHT + 0.15, z]}
      rotation={[0, Math.PI / 6, 0]}
      geometry={ghostGeo}
    >
      <meshBasicMaterial color="#38bdf8" transparent opacity={0.4} />
    </mesh>
  );
}
