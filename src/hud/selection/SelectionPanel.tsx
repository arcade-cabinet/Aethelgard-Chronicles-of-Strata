import * as Tooltip from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import {
  Building,
  type BuildingType,
  FactionTrait,
  type FormationId,
  Health,
  HexPosition,
  PeonAutonomy,
  Stack,
  Stance,
  type StanceMode,
  Unit,
} from '@/ecs/components';
import { doResearch, setPeonAutoMode, setStance, trainUnit } from '@/game/utilities';
import { canAfford, type ResourceCost } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { canResearch, type ResearchId } from '@/game/research';
import { selectEntities, selectedEntities, selectedEntity } from '@/game/selection';
import { setStackFormation } from '@/game/stacking';
import { BUILDING_COSTS, discoveryById, displayFor, UNIT_COSTS } from '@/rules';
import { FORMATIONS } from '@/world/board';
import type { BuildContext } from '@/world/terrain';
import { costLabel } from '../theme';
import { HUD_CARD_STYLE, HUD_THEME } from '../theme';
import './th-affordance.css';
import {
  buildDisabledReason,
  researchDisabledReason,
  trainDisabledReason,
} from './selection-panel-reasons';
import { useRafLoop } from '../useRafLoop';

/** Buildable types derived from the BUILDING_COSTS table — NOT hardcoded. */
const BUILDABLE_TYPES = Object.keys(BUILDING_COSTS).sort() as ReadonlyArray<
  Exclude<BuildingType, 'Palace'>
>;

/** Whether the player's economy can cover a building cost — thin wrapper over rules.canAfford. */
function canAffordCost(game: GameState, cost: ResourceCost): boolean {
  return canAfford(game.economy.player, cost);
}

/**
 * M_V11.OPEN.TH-AFFORDANCE — count of player-faction Peon entities
 * (spawned + queued). The Palace "Train Peon" CTA pulses while
 * this is zero so the player sees the first decision they must
 * make. Drains O(units); fine — Selection-panel render is rare.
 */
function countPlayerPeons(game: GameState): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    n++;
  }
  return n;
}

// M_EXPANSION.D.172 — disabled-reason helpers moved to a sibling
// (./selection-panel-reasons.ts) so this file stays under the
// 400-line cognitive-load threshold. The three exports
// trainDisabledReason / buildDisabledReason / researchDisabledReason
// are imported below.

/** Military unit types that carry a Stance trait (M_POLISH2.RTS.16). */
const MILITARY_UNIT_TYPES = new Set<string>(['Footman', 'Wizard', 'Hero']);

/** Props for the selection panel. */
export interface SelectionPanelProps {
  /** The live game. */
  game: GameState;
  /** Begin placing a building (the App threads this into TileInteraction). */
  onBeginBuild: (ctx: BuildContext) => void;
}

/**
 * A description of the selected entity for display. Building-specific
 * branching uses `buildingType` + the rules/display.ts table — not hardcoded
 * `isPalace`/`isBarracks` flags. Adding a new building type with actions
 * is one BUILDING_DISPLAY row, no SelectionPanel JSX change.
 */
interface SelectionView {
  /** Display name. */
  name: string;
  /** State / task line. */
  task: string;
  /** Selected building's type, or null when a unit is selected. */
  buildingType: BuildingType | null;
  /** Current stance of the selected military unit, or null for non-military. */
  stance: StanceMode | null;
  /** M_HUD.SHELL.16b — selected faction's banner colour for left-rail accent. */
  factionColor: string;
  /**
   * M_GAME.MODE.PEON.2 — autoMode of the selected peon, or null for
   * non-peon / non-player selections. Drives the Take command /
   * Resume automation button on the SelectionPanel.
   */
  peonAutoMode: 'auto' | 'manual' | null;
  /** M_V11.STACK.PANEL — current formation id of the selected Stack,
   *  or null when the selection is not a Stack. Drives the "Switch
   *  Formation" fieldset render. */
  formationId: FormationId | null;
  /** M_V11.SEL.MULTI-VIEW — when >1 entity is selected, a per-type
   *  breakdown (Footman ×3, Peon ×2, etc.). null in the single-
   *  selection case so the header collapses cleanly. */
  multi: {
    total: number;
    typeCounts: Array<{ type: string; count: number }>;
  } | null;
  /** M_V11.SEL.PEON-VERBS — intersection-verb gates. true ⇒ EVERY
   *  selected entity supports this verb, so it's safe to show as a
   *  group action. In the single-selection case these are simply
   *  the primary's per-trait checks. */
  intersectionVerbs: {
    /** All selected entities are military units (Stance trait
     *  applies to every one). Drives the stance fieldset gate. */
    allMilitary: boolean;
    /** All selected entities are player peons (Take/Resume applies
     *  to every one). Drives the autoMode button gate. */
    allPlayerPeons: boolean;
    /** M_V11.SEL.PEON-VERBS.SUBMENUS — for mixed selections, expose
     *  per-class verb surfaces. anyMilitary lets the stance fieldset
     *  render as a per-type submenu (apply to the military subset
     *  only); anyPlayerPeon does the same for the autoMode button.
     *  Counts give the submenu its label ("Military (3)"). */
    anyMilitary: boolean;
    anyPlayerPeon: boolean;
    militaryCount: number;
    playerPeonCount: number;
  };
}

/** Summarize a multi-entity selection into per-type counts. */
function buildMultiSummary(
  entities: ReadonlyArray<{
    get: (...args: never[]) => unknown;
  }>,
): NonNullable<SelectionView['multi']> {
  const counts = new Map<string, number>();
  for (const e of entities as ReadonlyArray<import('koota').Entity>) {
    const u = e.get(Unit);
    const b = e.get(Building);
    const label = u?.unitType ?? b?.buildingType ?? 'Other';
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const typeCounts = Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));
  return { total: entities.length, typeCounts };
}

/** M_V11.SEL.PEON-VERBS — compute which group-actions apply to the
 *  intersection of selected entities. The single-selection case
 *  collapses to "does the one selected entity support this verb".
 *  Returns false-flags when the selection is empty (defensive). */
function computeIntersectionVerbs(
  entities: ReadonlyArray<import('koota').Entity>,
): SelectionView['intersectionVerbs'] {
  if (entities.length === 0) {
    return {
      allMilitary: false,
      allPlayerPeons: false,
      anyMilitary: false,
      anyPlayerPeon: false,
      militaryCount: 0,
      playerPeonCount: 0,
    };
  }
  let allMilitary = true;
  let allPlayerPeons = true;
  let militaryCount = 0;
  let playerPeonCount = 0;
  for (const e of entities) {
    const u = e.get(Unit);
    const f = e.get(FactionTrait)?.faction;
    const isMilitary = !!(u && MILITARY_UNIT_TYPES.has(u.unitType));
    const isPlayerPeon = !!(u && u.unitType === 'Peon' && f === 'player');
    if (isMilitary) militaryCount++;
    if (isPlayerPeon) playerPeonCount++;
    if (!isMilitary) allMilitary = false;
    if (!isPlayerPeon) allPlayerPeons = false;
  }
  return {
    allMilitary,
    allPlayerPeons,
    anyMilitary: militaryCount > 0,
    anyPlayerPeon: playerPeonCount > 0,
    militaryCount,
    playerPeonCount,
  };
}

/** Build a display view from the selected entity. */
function viewOf(game: GameState): SelectionView | null {
  const entity = selectedEntity(game);
  if (!entity) return null;
  const factionTrait = entity.get(FactionTrait);
  const factionId = factionTrait?.faction ?? 'player';
  const factionColor =
    game.factions.find((f) => f.id === factionId)?.color ?? HUD_THEME.color.friendly;
  // M_V11.SEL.MULTI-VIEW — when >1 entity is selected, summarize the
  // composition. Counts both Units (by unitType) AND Buildings (by
  // buildingType) so a mixed click+drag selection still tells the
  // player what they have. Sorted by count desc + name asc for
  // stable display.
  const all = selectedEntities(game);
  const multi = all.length > 1 ? buildMultiSummary(all) : null;
  // M_V11.SEL.PEON-VERBS — intersection-verb gates: a group action
  // only renders if EVERY selected entity supports it. Single-
  // selection falls through to the primary's per-trait booleans.
  const intersectionVerbs = computeIntersectionVerbs(all.length > 0 ? all : [entity]);
  const building = entity.get(Building);
  if (building) {
    const meta = displayFor(building.buildingType);
    const task = building.isComplete
      ? 'Operational'
      : `Constructing — ${Math.round(building.progress * 100)}%`;
    return {
      name: meta.name,
      task,
      buildingType: building.buildingType,
      stance: null,
      factionColor,
      peonAutoMode: null,
      formationId: null,
      multi,
      intersectionVerbs,
    };
  }
  // M_V11.STACK.PANEL — Stack entity selection (the formation badge
  // surface is clickable in a future commit; for now, sticking a
  // ranged-attack StackMember tile selects the Stack via game.selection).
  const stack = entity.get(Stack);
  if (stack) {
    const spec = FORMATIONS[stack.formationId];
    return {
      name: `${spec.name} (${stack.members.length})`,
      task: `HP ${Math.round(stack.combinedHp)}/${stack.combinedMaxHp} — DPS ${Math.round(
        stack.combinedDps,
      )}`,
      buildingType: null,
      stance: null,
      factionColor,
      peonAutoMode: null,
      formationId: stack.formationId,
      multi,
      intersectionVerbs,
    };
  }
  const unit = entity.get(Unit);
  if (unit) {
    const health = entity.get(Health);
    const hp = health ? ` — ${health.current}/${health.max} HP` : '';
    // M_POLISH2.RTS.16 — expose stance for military unit types.
    const stanceTrait = MILITARY_UNIT_TYPES.has(unit.unitType) ? entity.get(Stance) : null;
    // M_GAME.MODE.PEON.2 — surface peon autoMode for the player's
    // peons only (enemy peons are not commandable).
    const isPlayerPeon = unit.unitType === 'Peon' && factionId === 'player';
    const peonAutoMode = isPlayerPeon ? (entity.get(PeonAutonomy)?.autoMode ?? null) : null;
    return {
      name: unit.unitType,
      task: `Ready${hp}`,
      buildingType: null,
      stance: stanceTrait?.mode ?? null,
      factionColor,
      peonAutoMode,
      formationId: null,
      multi,
      intersectionVerbs,
    };
  }
  return {
    name: 'Unknown',
    task: '',
    buildingType: null,
    stance: null,
    factionColor,
    peonAutoMode: null,
    formationId: null,
    multi,
    intersectionVerbs,
  };
}

/**
 * A Radix-styled HUD button. M_AUDIT2.UX.9 — when `disabled` and
 * `disabledReason` is set, wraps the button in a Radix Tooltip so the
 * player learns WHY (cost / prereq / supply cap) on hover or focus
 * instead of the button being mysteriously inert.
 */
function HudButton({
  label,
  onClick,
  disabled,
  disabledReason,
  highlighted,
  highlightColor,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Shown via Tooltip + title when disabled. ≥3 words: explain the gate. */
  disabledReason?: string | undefined;
  /**
   * M_V11.OPEN.TH-AFFORDANCE — when true, pulse a faction-coloured
   * halo around the button to draw the player's eye. Used for the
   * "Queue Peon" CTA on the Palace until the first peon is
   * queued. Quiet otherwise (no pulse, no border-color shift).
   */
  highlighted?: boolean;
  /** Halo + border accent color when highlighted. Default treasure. */
  highlightColor?: string;
}) {
  const accent = highlightColor ?? HUD_THEME.color.gold;
  const btn = (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled}
      aria-label={disabled && disabledReason ? `${label} (${disabledReason})` : label}
      aria-describedby={disabled && disabledReason ? `${label}-reason` : undefined}
      data-testid={`hud-button-${label.replace(/\s+/g, '-').toLowerCase()}`}
      data-highlighted={highlighted ? 'true' : undefined}
      style={{
        display: 'block',
        width: '100%',
        marginTop: 6,
        // M_HUD.SHELL.16 — touch-friendly: min 44×44 with padding ≥ 12px
        // so finger taps don't accidentally hit an adjacent button on
        // a phone-portrait viewport.
        minHeight: 44,
        padding: '12px 12px',
        borderRadius: 8,
        border: highlighted ? `1px solid ${accent}` : `1px solid ${HUD_THEME.color.border}`,
        background: disabled
          ? 'rgba(255,255,255,0.04)'
          : highlighted
            ? `linear-gradient(180deg, ${accent}33 0%, ${accent}1a 100%)`
            : 'rgba(56,189,248,0.14)',
        color: disabled ? HUD_THEME.color.muted : highlighted ? accent : HUD_THEME.color.accent,
        fontFamily: HUD_THEME.font.body,
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
        // M_V11.OPEN.TH-AFFORDANCE — gentle 2s pulse on the halo.
        // Uses CSS shadow rather than framer-motion to avoid a layout
        // hit on every button repaint.
        boxShadow: highlighted ? `0 0 0 0 ${accent}66` : undefined,
        animation: highlighted ? 'th-affordance-pulse 1.8s ease-in-out infinite' : undefined,
        transition: 'box-shadow 200ms ease, border-color 200ms ease',
      }}
    >
      {label}
    </button>
  );
  if (!disabled || !disabledReason) return btn;
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{btn}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="left"
          sideOffset={6}
          style={{
            background: HUD_THEME.color.panel,
            border: `1px solid ${HUD_THEME.color.border}`,
            borderRadius: 6,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            fontSize: '0.72rem',
            padding: '6px 10px',
            zIndex: 250,
            boxShadow: '0 4px 14px rgba(0,0,0,0.45)',
          }}
        >
          {disabledReason}
          <Tooltip.Arrow style={{ fill: HUD_THEME.color.border }} />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/** Stance chip metadata — label + mode value for the 4-segment picker. */
const STANCE_CHIPS: ReadonlyArray<{ mode: StanceMode; label: string }> = [
  { mode: 'aggressive', label: 'Aggressive' },
  { mode: 'defensive', label: 'Defensive' },
  { mode: 'hold-position', label: 'Hold' },
  { mode: 'stand-ground', label: 'Stand' },
];

/**
 * The HUD selection panel. Slides in from the left (framer-motion) when an
 * entity is selected. The Palace shows build buttons (Farm, Barracks); a
 * Barracks shows research buttons. Buttons call the M6 game commands.
 *
 * UI sounds fire via the module-level emitter so they reach the howler buses
 * owned by `useAudio` inside the r3f Canvas.
 */
export function SelectionPanel({ game, onBeginBuild }: SelectionPanelProps) {
  const [view, setView] = useState<SelectionView | null>(() => viewOf(game));
  // Track whether the panel was open last render to detect open transitions.
  const wasOpenRef = useRef<boolean>(view !== null);

  useRafLoop(() => {
    // M_MICRO.5.3 — diff before setView so React skips reconcile
    // when the SelectionView is identical to last frame (the common
    // case: idle peon selected, nothing changing). viewOf returns a
    // fresh object every call; compare fields, not refs.
    setView((prev) => {
      const next = viewOf(game);
      if (next === null && prev === null) return prev;
      if (
        next !== null &&
        prev !== null &&
        next.name === prev.name &&
        next.task === prev.task &&
        next.buildingType === prev.buildingType &&
        next.stance === prev.stance &&
        next.peonAutoMode === prev.peonAutoMode &&
        next.formationId === prev.formationId &&
        // Cheap multi diff: total + first-row signature. Misses
        // a rare same-total-different-mix transition; that's
        // acceptable for a 60Hz throttled HUD diff.
        (next.multi?.total ?? 0) === (prev.multi?.total ?? 0) &&
        (next.multi?.typeCounts[0]?.type ?? '') === (prev.multi?.typeCounts[0]?.type ?? '') &&
        (next.multi?.typeCounts[0]?.count ?? 0) === (prev.multi?.typeCounts[0]?.count ?? 0)
      ) {
        return prev;
      }
      return next;
    });
  }, [game]);

  // Fire ui-panel-open sound when the panel transitions from closed → open.
  const isOpen = view !== null;
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      emitUiSound('ui-panel-open');
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const research = (id: ResearchId) => {
    const canDo = canResearch(game.economy.player, game.research, id);
    if (canDo) {
      doResearch(game, id);
      emitUiSound('research-purchased');
    } else {
      emitUiSound('ui-button-click');
    }
  };

  const beginBuild = (ctx: BuildContext) => {
    emitUiSound('ui-button-click');
    onBeginBuild(ctx);
  };

  /** M_POLISH2.RTS.16 + M_V11.SEL.PEON-VERBS.SUBMENUS — change
   *  stance for the military subset of the selection. Multi-select
   *  with mixed types: applies to military entities only (peons
   *  skipped). Single-select: applies to the primary if military. */
  const changeStance = (mode: StanceMode) => {
    const all = selectedEntities(game);
    const targets = all.length > 0 ? all : [selectedEntity(game)].filter(Boolean);
    let okCount = 0;
    for (const e of targets) {
      if (!e) continue;
      const u = e.get(Unit);
      if (!u || !MILITARY_UNIT_TYPES.has(u.unitType)) continue;
      setStance(game, e, mode, 'player');
      okCount++;
    }
    emitUiSound(okCount > 0 ? 'ui-button-click' : 'ui-error');
  };

  /** M_V11.STACK.PANEL — switch the selected Stack's formation. */
  const changeFormation = (target: FormationId) => {
    // M_V11.STACK.PANEL.MULTI-STACK — apply formation switch across
    // EVERY selected stack entity (not just the primary). Mixed
    // single + multi flows: single → loop runs once on the primary;
    // multi → loop runs over each selected Stack entity. Non-stack
    // members in the selection are skipped (setStackFormation
    // requires a Stack trait).
    const all = selectedEntities(game);
    const targets = all.length > 0 ? all.filter((e) => e.has(Stack)) : [];
    if (targets.length === 0) {
      const primary = selectedEntity(game);
      if (!primary) return;
      const result = setStackFormation(game, primary, target);
      emitUiSound(result.ok ? 'ui-button-click' : 'ui-error');
      return;
    }
    let okCount = 0;
    for (const stack of targets) {
      if (setStackFormation(game, stack, target).ok) okCount++;
    }
    emitUiSound(okCount > 0 ? 'ui-button-click' : 'ui-error');
  };

  /** M_V11.SEL.ALL-OF-TYPE — select every same-faction unit of the
   *  primary's unit type currently in the world. Cap at 50 so the
   *  HUD diff doesn't choke on a mega-army. */
  const selectAllOfType = (faction: string, unitType: string) => {
    const matches: Array<import('koota').Entity> = [];
    for (const e of game.world.query(Unit, FactionTrait)) {
      if (e.get(FactionTrait)?.faction !== faction) continue;
      if (e.get(Unit)?.unitType !== unitType) continue;
      matches.push(e);
      if (matches.length >= 50) break;
    }
    if (matches.length > 0) selectEntities(game, matches);
    emitUiSound(matches.length > 0 ? 'ui-button-click' : 'ui-error');
  };

  /** M_V11.SEL.ALL-OF-TYPE.BIOME — biome-scoped peon selector.
   *  Picks the primary's tile biome from game.board.tiles, then
   *  selects every same-faction peon currently standing on the
   *  same biome. Cap at 50. */
  const selectAllPeonsOfBiome = (faction: string) => {
    const primary = selectedEntity(game);
    if (!primary) {
      emitUiSound('ui-error');
      return;
    }
    const primaryHex = primary.get(HexPosition);
    if (!primaryHex) {
      emitUiSound('ui-error');
      return;
    }
    const primaryTile = game.board.tiles.get(`${primaryHex.q},${primaryHex.r}`);
    if (!primaryTile) {
      emitUiSound('ui-error');
      return;
    }
    const targetBiome = primaryTile.type;
    const matches: Array<import('koota').Entity> = [];
    for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
      if (e.get(FactionTrait)?.faction !== faction) continue;
      if (e.get(Unit)?.unitType !== 'Peon') continue;
      const hex = e.get(HexPosition);
      if (!hex) continue;
      const tile = game.board.tiles.get(`${hex.q},${hex.r}`);
      if (tile?.type !== targetBiome) continue;
      matches.push(e);
      if (matches.length >= 50) break;
    }
    if (matches.length > 0) selectEntities(game, matches);
    emitUiSound(matches.length > 0 ? 'ui-button-click' : 'ui-error');
  };

  return (
    // M_AUDIT2.UX.9 — Tooltip.Provider scoped here so the HudButton
    // disabledReason tooltips render. delayDuration=300 matches the
    // game's tap-vs-hover heuristic so a quick mouse pass doesn't
    // flash a tip.
    <Tooltip.Provider delayDuration={300}>
      <AnimatePresence>
        {view && (
          <motion.div
            id="selection-panel"
            role="region"
            aria-label={`Selected: ${view.name}`}
            data-hud-panel
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -40, opacity: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            style={{
              ...HUD_CARD_STYLE,
              position: 'absolute',
              left: 16,
              bottom: 16,
              width: 'clamp(220px, 22vw, 280px)',
              padding: '14px 16px',
              // M_HUD.SHELL.16b — selected-faction-colour left-rail accent
              // makes whose unit/building this is glanceable. Falls back to
              // the friendly green when no faction info is available.
              borderLeft: `4px solid ${view.factionColor}`,
              paddingLeft: 14,
              // M_V11.POLISH.SELECTION-PANEL-DENSITY — clamp the panel
              // height to 70% of viewport so it doesn't spill off-screen
              // on a phone-portrait when a Palace selection surfaces
              // the train/build/research lists below the formation +
              // stance + autoMode + select-all chips. Internal scroll
              // keeps every action reachable.
              maxHeight: 'min(70vh, 640px)',
              overflowY: 'auto',
            }}
          >
            {/* M_V11.SEL.MULTI-VIEW — composition strip when >1 entity
                is selected. Shows up to 4 type chips ("Footman ×3")
                + an overflow count for the rest. */}
            {view.multi && (
              <ul
                data-testid="selection-multi-summary"
                aria-label={`${view.multi.total} units selected`}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 4,
                  marginBottom: 8,
                  padding: 0,
                  margin: 0,
                  listStyle: 'none',
                }}
              >
                {view.multi.typeCounts.slice(0, 4).map((row) => (
                  <li
                    key={row.type}
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(56,189,248,0.18)',
                      color: HUD_THEME.color.accent,
                      fontWeight: 700,
                    }}
                  >
                    {row.type} ×{row.count}
                  </li>
                ))}
                {view.multi.typeCounts.length > 4 && (
                  <li
                    style={{
                      fontSize: '0.7rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: 'rgba(255,255,255,0.05)',
                      color: HUD_THEME.color.muted,
                    }}
                  >
                    +{view.multi.typeCounts.length - 4} more
                  </li>
                )}
              </ul>
            )}
            <div
              style={{
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: HUD_THEME.color.muted,
              }}
            >
              {view.multi ? `Primary (${view.multi.total} selected)` : 'Selected'}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: HUD_THEME.color.friendly }}>
              {view.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#fde047', marginTop: 2 }}>{view.task}</div>

            {/* M_V11.SEL.ALL-OF-TYPE — small "All <Type>" button for
                unit selections so the player can expand to every
                same-faction same-type unit currently in the world.
                Hidden for Stack / Building / Unknown selections —
                those don't multi-select in this shape. */}
            {view.stance !== null || view.peonAutoMode !== null
              ? (() => {
                  const entity = selectedEntity(game);
                  const u = entity?.get(Unit);
                  const f = entity?.get(FactionTrait)?.faction;
                  if (!u || !f) return null;
                  const isPeon = u.unitType === 'Peon';
                  return (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <button
                        type="button"
                        id={`selection-select-all-${u.unitType.toLowerCase()}`}
                        onClick={() => selectAllOfType(f, u.unitType)}
                        data-testid={`select-all-${u.unitType.toLowerCase()}`}
                        aria-label={`Select all ${u.unitType}s`}
                        style={{
                          padding: '6px 10px',
                          minHeight: 32,
                          borderRadius: 6,
                          border: `1px solid ${HUD_THEME.color.border}`,
                          background: 'rgba(255,255,255,0.04)',
                          color: HUD_THEME.color.accent,
                          fontFamily: HUD_THEME.font.body,
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Select all {u.unitType}s
                      </button>
                      {/* M_V11.SEL.ALL-OF-TYPE.BIOME — biome-scoped
                          peon selector. Only renders for Peon
                          selections. */}
                      {isPeon && (
                        <button
                          type="button"
                          id="selection-select-all-peons-biome"
                          onClick={() => selectAllPeonsOfBiome(f)}
                          data-testid="select-all-peons-biome"
                          aria-label="Select all peons on this biome"
                          style={{
                            padding: '6px 10px',
                            minHeight: 32,
                            borderRadius: 6,
                            border: `1px solid ${HUD_THEME.color.border}`,
                            background: 'rgba(255,255,255,0.04)',
                            color: HUD_THEME.color.accent,
                            fontFamily: HUD_THEME.font.body,
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Select peons on this biome
                        </button>
                      )}
                    </div>
                  );
                })()
              : null}

            {/* M_POLISH2.RTS.16 — 4-segment stance picker for military
                units. M_V11.SEL.PEON-VERBS — in multi-select, gate on
                "all selected are military" (intersectionVerbs.allMilitary)
                so peon+footman mixed selections don't surface Stance.
                In single-select, view.stance !== null IS the check
                (set when the primary is military). */}
            {(view.stance !== null ||
              (view.multi !== null && view.intersectionVerbs.anyMilitary)) && (
              <div style={{ marginTop: 10 }}>
                <div
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: HUD_THEME.color.muted,
                    marginBottom: 4,
                  }}
                >
                  {view.multi && !view.intersectionVerbs.allMilitary
                    ? `Stance — Military (${view.intersectionVerbs.militaryCount})`
                    : 'Stance'}
                </div>
                <fieldset
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 4,
                    border: 'none',
                    margin: 0,
                    padding: 0,
                  }}
                  aria-label="Unit stance"
                >
                  {STANCE_CHIPS.map(({ mode, label }) => {
                    const active = view.stance === mode;
                    return (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={active}
                        onClick={() => changeStance(mode)}
                        style={{
                          minHeight: 44,
                          padding: '6px 4px',
                          borderRadius: 6,
                          border: `1px solid ${active ? HUD_THEME.color.accent : HUD_THEME.color.border}`,
                          background: active ? 'rgba(56,189,248,0.25)' : 'rgba(255,255,255,0.04)',
                          color: active ? HUD_THEME.color.accent : HUD_THEME.color.text,
                          fontFamily: HUD_THEME.font.body,
                          fontSize: '0.72rem',
                          fontWeight: active ? 800 : 500,
                          cursor: 'pointer',
                          textAlign: 'center',
                          lineHeight: 1.2,
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </fieldset>
              </div>
            )}

            {/* M_V11.STACK.PANEL — formation switcher. Only renders
                when the selected entity is a Stack. Each chip:
                  - active when view.formationId === id
                  - disabled w/ tooltip when the Discovery isn't owned,
                    composition fails validate, or stack is mid-combat
                The setStackFormation call returns the rejection
                reason verbatim, so we surface it as the chip's title. */}
            {view.formationId !== null &&
              (() => {
                const entity = selectedEntity(game);
                const ownedDiscoveries = game.research?.purchased ?? new Set();
                return (
                  <div style={{ marginTop: 10 }}>
                    <div
                      style={{
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        color: HUD_THEME.color.muted,
                        marginBottom: 4,
                      }}
                    >
                      Formation
                    </div>
                    <fieldset
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                        border: 'none',
                        margin: 0,
                        padding: 0,
                      }}
                      aria-label="Stack formation"
                    >
                      {Object.values(FORMATIONS).map((spec) => {
                        const active = view.formationId === spec.id;
                        // Dry-run gate: simulate setStackFormation
                        // without calling it so we can show a reason
                        // in the tooltip. The real check still runs
                        // on click so race conditions surface.
                        let disabled = false;
                        let reason: string | undefined;
                        if (entity && !active) {
                          if (
                            spec.unlockDiscovery !== null &&
                            // `ownedDiscoveries` is `Set<ResearchId>` (narrow
                            // union); `spec.unlockDiscovery` is the broader
                            // string the formation registry stores. We do a
                            // string-comparison membership test via Array.from
                            // to avoid the previous `as never` escape hatch
                            // (CodeRabbit PR #89).
                            !Array.from(ownedDiscoveries).some(
                              (d) => (d as string) === spec.unlockDiscovery,
                            )
                          ) {
                            disabled = true;
                            reason = `Requires Discovery: ${spec.unlockDiscovery}`;
                          }
                        }
                        return (
                          <button
                            key={spec.id}
                            type="button"
                            id={`selection-formation-${spec.id}`}
                            aria-pressed={active}
                            aria-label={`${spec.name} formation${disabled ? ' (locked)' : ''}`}
                            onClick={() => changeFormation(spec.id)}
                            disabled={disabled}
                            title={reason}
                            data-testid={`formation-chip-${spec.id}`}
                            style={{
                              minHeight: 44,
                              padding: '6px 4px',
                              borderRadius: 6,
                              border: `1px solid ${
                                active ? HUD_THEME.color.accent : HUD_THEME.color.border
                              }`,
                              background: disabled
                                ? 'rgba(255,255,255,0.04)'
                                : active
                                  ? 'rgba(56,189,248,0.25)'
                                  : 'rgba(255,255,255,0.06)',
                              color: disabled
                                ? HUD_THEME.color.muted
                                : active
                                  ? HUD_THEME.color.accent
                                  : HUD_THEME.color.text,
                              fontFamily: HUD_THEME.font.body,
                              fontSize: '0.72rem',
                              fontWeight: active ? 800 : 500,
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              textAlign: 'center',
                              lineHeight: 1.2,
                            }}
                          >
                            {spec.name}
                          </button>
                        );
                      })}
                    </fieldset>
                  </div>
                );
              })()}

            {/* M_GAME.MODE.PEON.2 + M_V11.SEL.PEON-VERBS.SUBMENUS —
                peon autonomy action. Single-select: peon's autoMode
                is non-null. Multi-select: renders as a per-class
                submenu when ANY selected entity is a player peon,
                operating on the peon subset only. */}
            {(view.peonAutoMode !== null ||
              (view.multi !== null && view.intersectionVerbs.anyPlayerPeon)) && (
              <div style={{ marginTop: 10 }}>
                <HudButton
                  label={
                    view.multi
                      ? view.intersectionVerbs.allPlayerPeons
                        ? `${view.peonAutoMode === 'auto' ? 'Take all' : 'Resume all'} (${view.multi.total})`
                        : `Take peons (${view.intersectionVerbs.playerPeonCount})`
                      : view.peonAutoMode === 'auto'
                        ? 'Take command'
                        : 'Resume automation'
                  }
                  onClick={() => {
                    // M_V11.SEL.BATCH-PEON — apply autoMode flip to
                    // every selected peon, not just the primary.
                    // Walks game.world.query each call so race
                    // conditions (a peon destroyed under selection)
                    // are surfaced via setPeonAutoMode's bool return.
                    const targets = view.multi
                      ? selectedEntities(game).filter((e) => {
                          const u = e.get(Unit);
                          const f = e.get(FactionTrait)?.faction;
                          return u?.unitType === 'Peon' && f === 'player';
                        })
                      : selectedEntity(game)
                        ? [selectedEntity(game) as import('koota').Entity]
                        : [];
                    if (targets.length === 0) {
                      emitUiSound('ui-error');
                      return;
                    }
                    const nextMode = view.peonAutoMode === 'auto' ? 'manual' : 'auto';
                    let okCount = 0;
                    for (const t of targets) {
                      if (setPeonAutoMode(game, t, nextMode)) okCount++;
                    }
                    emitUiSound(okCount > 0 ? 'ui-button-click' : 'ui-error');
                  }}
                />
              </div>
            )}

            {view.buildingType &&
              (() => {
                const meta = displayFor(view.buildingType);
                return (
                  <div style={{ marginTop: 10 }}>
                    {/* Train buttons — driven by display.trainsUnits, NOT building type.
                        M_POLISH2.RTS.22: Palace now yields [Peon, Scout]; each gets
                        its own HudButton rendered in order. */}
                    {(meta.trainsUnits ?? []).map((role) => {
                      const cost = UNIT_COSTS[role];
                      const trainReason = trainDisabledReason(game, role, cost);
                      // M_V11.OPEN.TH-AFFORDANCE — pulse the "Train
                      // Peon" CTA on the Palace until the player
                      // queues their first peon. Gated tight: only
                      // role === 'Peon', only when the player has
                      // zero peons in the world (including queued).
                      // Once any peon exists, the pulse retires.
                      const highlighted =
                        view.buildingType === 'Palace' &&
                        role === 'Peon' &&
                        countPlayerPeons(game) === 0 &&
                        canAffordCost(game, cost);
                      return (
                        <HudButton
                          key={role}
                          label={`Train ${role} — ${costLabel(cost)}`}
                          onClick={() => {
                            const ok = trainUnit(game, role, 'player');
                            // M_EXPANSION.AU.36 — error chime when the
                            // command was rejected (mid-click prereqs
                            // changed, supply cap raced, etc.).
                            emitUiSound(ok ? 'ui-button-click' : 'ui-error');
                          }}
                          disabled={!canAffordCost(game, cost)}
                          disabledReason={trainReason}
                          highlighted={highlighted}
                          highlightColor={view.factionColor}
                        />
                      );
                    })}
                    {/* M_V11.POLISH.SELECTION-PANEL-ACCORDION — Build
                        menu folded into a <details> so the long list
                        doesn't dominate on a phone-portrait viewport.
                        Default-open. */}
                    {meta.showsBuildMenu && (
                      <details
                        open
                        style={{
                          marginTop: 10,
                          padding: 0,
                          border: 'none',
                        }}
                      >
                        <summary
                          style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            color: HUD_THEME.color.muted,
                            cursor: 'pointer',
                            padding: '4px 0',
                            userSelect: 'none',
                          }}
                        >
                          Build ({BUILDABLE_TYPES.length})
                        </summary>
                        {BUILDABLE_TYPES.map((type) => {
                          const cost = BUILDING_COSTS[type];
                          const buildReason = buildDisabledReason(game, type, cost);
                          return (
                            <HudButton
                              key={type}
                              label={`Build ${type} — ${costLabel(cost)}`}
                              onClick={() => beginBuild({ type, onPlaced: () => {} })}
                              disabled={buildReason !== undefined}
                              disabledReason={buildReason}
                            />
                          );
                        })}
                      </details>
                    )}
                    {/* M_V11.POLISH.SELECTION-PANEL-ACCORDION — Research
                        list also folded. Closed by default since
                        building > researching in early-game decision
                        ordering. */}
                    {meta.research && meta.research.length > 0 && (
                      <details
                        style={{
                          marginTop: 10,
                          padding: 0,
                          border: 'none',
                        }}
                      >
                        <summary
                          style={{
                            fontSize: '0.7rem',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            color: HUD_THEME.color.muted,
                            cursor: 'pointer',
                            padding: '4px 0',
                            userSelect: 'none',
                          }}
                        >
                          Research ({meta.research.length})
                        </summary>
                        {meta.research.map((id) => {
                          const d = discoveryById(id);
                          if (!d) return null;
                          const reason = researchDisabledReason(game, id, d.name, d.cost);
                          return (
                            <HudButton
                              key={id}
                              label={`${d.name} — ${costLabel(d.cost)}`}
                              onClick={() => research(id)}
                              disabled={!canResearch(game.economy.player, game.research, id)}
                              disabledReason={reason}
                            />
                          );
                        })}
                      </details>
                    )}
                    {meta.hasRally && (
                      <div
                        style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, marginTop: 6 }}
                      >
                        Tap a tile to set the rally point.
                      </div>
                    )}
                  </div>
                );
              })()}
          </motion.div>
        )}
      </AnimatePresence>
    </Tooltip.Provider>
  );
}
