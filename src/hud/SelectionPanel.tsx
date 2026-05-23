import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import { Building, type BuildingType, Health, Unit } from '@/ecs/components';
import { doResearch, trainUnit } from '@/game/commands';
import { canAfford, type ResourceCost } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { canResearch, type ResearchId } from '@/game/research';
import { selectedEntity } from '@/game/selection';
import { BUILDING_COSTS, discoveryById, displayFor, UNIT_COSTS } from '@/rules';
import type { BuildContext } from '@/world/TileInteraction';
import { costLabel } from './format';
import { HUD_THEME } from './hud-theme';

/** Buildable types derived from the BUILDING_COSTS table — NOT hardcoded. */
const BUILDABLE_TYPES = Object.keys(BUILDING_COSTS).sort() as ReadonlyArray<
  Exclude<BuildingType, 'TownHall'>
>;

/** Whether the player's economy can cover a building cost — thin wrapper over rules.canAfford. */
function canAffordCost(game: GameState, cost: ResourceCost): boolean {
  return canAfford(game.economy.player, cost);
}

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
    return { name: meta.name, task, buildingType: building.buildingType };
  }
  const unit = entity.get(Unit);
  if (unit) {
    const health = entity.get(Health);
    const hp = health ? ` — ${health.current}/${health.max} HP` : '';
    return { name: unit.unitType, task: `Ready${hp}`, buildingType: null };
  }
  return { name: 'Unknown', task: '', buildingType: null };
}

/** A Radix-styled HUD button. */
function HudButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'block',
        width: '100%',
        marginTop: 6,
        padding: '8px 10px',
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
}

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

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setView(viewOf(game));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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

  return (
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
            position: 'absolute',
            left: 16,
            bottom: 16,
            width: 200,
            padding: '14px 16px',
            borderRadius: HUD_THEME.radius,
            background: HUD_THEME.color.panel,
            border: `1px solid ${HUD_THEME.color.border}`,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
          }}
        >
          <div
            style={{
              fontSize: '0.62rem',
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

          {view.buildingType &&
            (() => {
              const meta = displayFor(view.buildingType);
              return (
                <div style={{ marginTop: 10 }}>
                  {/* Train button — driven by display.trains, NOT building type */}
                  {meta.trains && (
                    <HudButton
                      label={`Train ${meta.trains} — ${costLabel(UNIT_COSTS[meta.trains])}`}
                      onClick={() => {
                        if (meta.trains && trainUnit(game, meta.trains, 'player'))
                          emitUiSound('ui-button-click');
                      }}
                      disabled={!canAffordCost(game, UNIT_COSTS[meta.trains])}
                    />
                  )}
                  {/* Build menu — only on buildings that show it (TownHall today) */}
                  {meta.showsBuildMenu &&
                    BUILDABLE_TYPES.map((type) => {
                      const cost = BUILDING_COSTS[type];
                      const afford = canAffordCost(game, cost);
                      return (
                        <HudButton
                          key={type}
                          label={`Build ${type} — ${costLabel(cost)}`}
                          onClick={() => beginBuild({ type, onPlaced: () => {} })}
                          disabled={!afford}
                        />
                      );
                    })}
                  {/* Discoveries — name, cost, gating all from the discoveries.json table */}
                  {meta.research?.map((id) => {
                    const d = discoveryById(id);
                    if (!d) return null;
                    return (
                      <HudButton
                        key={id}
                        label={`${d.name} — ${costLabel(d.cost)}`}
                        onClick={() => research(id)}
                        disabled={!canResearch(game.economy.player, game.research, id)}
                      />
                    );
                  })}
                  {meta.hasRally && (
                    <div
                      style={{ fontSize: '0.68rem', color: HUD_THEME.color.muted, marginTop: 6 }}
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
  );
}
