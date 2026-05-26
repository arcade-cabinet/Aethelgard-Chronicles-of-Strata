import * as Tooltip from '@radix-ui/react-tooltip';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import {
  Building,
  type BuildingType,
  Health,
  Stance,
  type StanceMode,
  Unit,
} from '@/ecs/components';
import { doResearch, setStance, trainUnit } from '@/game/commands';
import { canAfford, type ResourceCost } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { canResearch, type ResearchId } from '@/game/research';
import { selectedEntity } from '@/game/selection';
import { BUILDING_COSTS, discoveryById, displayFor, UNIT_COSTS } from '@/rules';
import type { BuildContext } from '@/world/TileInteraction';
import { costLabel } from './format';
import { HUD_CARD_STYLE, HUD_THEME } from './hud-theme';
import {
  buildDisabledReason,
  researchDisabledReason,
  trainDisabledReason,
} from './selection-panel-reasons';
import { useRafLoop } from './useRafLoop';

/** Buildable types derived from the BUILDING_COSTS table — NOT hardcoded. */
const BUILDABLE_TYPES = Object.keys(BUILDING_COSTS).sort() as ReadonlyArray<
  Exclude<BuildingType, 'TownHall'>
>;

/** Whether the player's economy can cover a building cost — thin wrapper over rules.canAfford. */
function canAffordCost(game: GameState, cost: ResourceCost): boolean {
  return canAfford(game.economy.player, cost);
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
 * `isTownHall`/`isBarracks` flags. Adding a new building type with actions
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
}

/** Build a display view from the selected entity. */
function viewOf(game: GameState): SelectionView | null {
  const entity = selectedEntity(game);
  if (!entity) return null;
  const building = entity.get(Building);
  if (building) {
    const meta = displayFor(building.buildingType);
    const task = building.isComplete
      ? 'Operational'
      : `Constructing — ${Math.round(building.progress * 100)}%`;
    return { name: meta.name, task, buildingType: building.buildingType, stance: null };
  }
  const unit = entity.get(Unit);
  if (unit) {
    const health = entity.get(Health);
    const hp = health ? ` — ${health.current}/${health.max} HP` : '';
    // M_POLISH2.RTS.16 — expose stance for military unit types.
    const stanceTrait = MILITARY_UNIT_TYPES.has(unit.unitType) ? entity.get(Stance) : null;
    return {
      name: unit.unitType,
      task: `Ready${hp}`,
      buildingType: null,
      stance: stanceTrait?.mode ?? null,
    };
  }
  return { name: 'Unknown', task: '', buildingType: null, stance: null };
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
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** Shown via Tooltip + title when disabled. ≥3 words: explain the gate. */
  disabledReason?: string | undefined;
}) {
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
        border: `1px solid ${HUD_THEME.color.border}`,
        background: disabled ? 'rgba(255,255,255,0.04)' : 'rgba(56,189,248,0.14)',
        color: disabled ? HUD_THEME.color.muted : HUD_THEME.color.accent,
        fontFamily: HUD_THEME.font.body,
        fontSize: '0.8rem',
        fontWeight: 700,
        cursor: disabled ? 'default' : 'pointer',
        textAlign: 'left',
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
 * entity is selected. The Town Hall shows build buttons (Farm, Barracks); a
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
        next.stance === prev.stance
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

  /** M_POLISH2.RTS.16 — change the selected military unit's stance. */
  const changeStance = (mode: StanceMode) => {
    const entity = selectedEntity(game);
    if (!entity) return;
    setStance(game, entity, mode, 'player');
    emitUiSound('ui-button-click');
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
              // M_AUDIT2.UX.19 — clamp() so labels like "Build Watchtower
              // — 60w 40s" stop truncating at the old 200px floor; still
              // capped to avoid pushing the minimap on portrait viewports.
              width: 'clamp(220px, 22vw, 280px)',
              padding: '14px 16px',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                letterSpacing: 1,
                color: HUD_THEME.color.muted,
              }}
            >
              Selected
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: HUD_THEME.color.friendly }}>
              {view.name}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#fde047', marginTop: 2 }}>{view.task}</div>

            {/* M_POLISH2.RTS.16 — 4-segment stance picker for military units */}
            {view.stance !== null && (
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
                  Stance
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

            {view.buildingType &&
              (() => {
                const meta = displayFor(view.buildingType);
                return (
                  <div style={{ marginTop: 10 }}>
                    {/* Train buttons — driven by display.trainsUnits, NOT building type.
                        M_POLISH2.RTS.22: TownHall now yields [Peon, Scout]; each gets
                        its own HudButton rendered in order. */}
                    {(meta.trainsUnits ?? []).map((role) => {
                      const cost = UNIT_COSTS[role];
                      const trainReason = trainDisabledReason(game, role, cost);
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
                        />
                      );
                    })}
                    {/* Build menu — only on buildings that show it (TownHall today) */}
                    {meta.showsBuildMenu &&
                      BUILDABLE_TYPES.map((type) => {
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
                    {/* Discoveries — name, cost, gating all from the discoveries.json table */}
                    {meta.research?.map((id) => {
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
