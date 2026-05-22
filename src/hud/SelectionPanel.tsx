import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { Building, type BuildingType, Health, Unit } from '@/ecs/components';
import { emitUiSound } from '@/audio/ui-sound-emitter';
import { doResearch, trainUnit } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { canResearch, RESEARCH_COST, type ResearchId } from '@/game/research';
import { selectedEntity } from '@/game/selection';
import { BUILDING_COSTS, UNIT_COSTS } from '@/rules';
import type { BuildContext } from '@/world/TileInteraction';
import { HUD_THEME } from './hud-theme';

/** Every type the player may build, in build-menu priority order. */
const BUILDABLE_TYPES: ReadonlyArray<Exclude<BuildingType, 'TownHall'>> = [
  'Farm',
  'House',
  'Granary',
  'Barracks',
  'Watchtower',
  'Wall',
];

/** Compact "60w 40s" cost label, omitting zero components. */
function costLabel(cost: { wood: number; stone: number; gold: number }): string {
  const parts: string[] = [];
  if (cost.wood) parts.push(`${cost.wood}w`);
  if (cost.stone) parts.push(`${cost.stone}s`);
  if (cost.gold) parts.push(`${cost.gold}g`);
  return parts.join(' ') || 'free';
}

/** Whether the player's economy can cover a building cost. */
function canAffordCost(
  game: GameState,
  cost: { wood: number; stone: number; gold: number },
): boolean {
  const eco = game.economy.player;
  return eco.wood >= cost.wood && eco.stone >= cost.stone && eco.gold >= cost.gold;
}

/** Props for the selection panel. */
export interface SelectionPanelProps {
  /** The live game. */
  game: GameState;
  /** Begin placing a building (the App threads this into TileInteraction). */
  onBeginBuild: (ctx: BuildContext) => void;
}

/** A description of the selected entity for display. */
interface SelectionView {
  /** Display name. */
  name: string;
  /** State / task line. */
  task: string;
  /** Whether it is the Town Hall (build buttons). */
  isTownHall: boolean;
  /** Whether it is a Barracks (research buttons). */
  isBarracks: boolean;
}

/** Build a display view from the selected entity. */
function viewOf(game: GameState): SelectionView | null {
  const entity = selectedEntity(game);
  if (!entity) return null;
  const building = entity.get(Building);
  if (building) {
    const name = building.buildingType === 'TownHall' ? 'Town Hall' : building.buildingType;
    const task = building.isComplete
      ? 'Operational'
      : `Constructing — ${Math.round(building.progress * 100)}%`;
    return {
      name,
      task,
      isTownHall: building.buildingType === 'TownHall',
      isBarracks: building.buildingType === 'Barracks',
    };
  }
  const unit = entity.get(Unit);
  if (unit) {
    const health = entity.get(Health);
    const hp = health ? ` — ${health.current}/${health.max} HP` : '';
    return { name: unit.unitType, task: `Ready${hp}`, isTownHall: false, isBarracks: false };
  }
  return { name: 'Unknown', task: '', isTownHall: false, isBarracks: false };
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

          {view.isTownHall && (
            <div style={{ marginTop: 10 }}>
              {/* Train Peon — the first thing a player should do at the Town Hall */}
              <HudButton
                label={`Train Peon — ${costLabel(UNIT_COSTS.Peon)}`}
                onClick={() => {
                  if (trainUnit(game, 'Peon', 'player')) emitUiSound('ui-button-click');
                }}
                disabled={!canAffordCost(game, UNIT_COSTS.Peon)}
              />
              {BUILDABLE_TYPES.map((type) => {
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
            </div>
          )}

          {view.isBarracks && (
            <div style={{ marginTop: 10 }}>
              {/* Train Footman — the Barracks' primary function */}
              <HudButton
                label={`Train Footman — ${costLabel(UNIT_COSTS.Footman)}`}
                onClick={() => {
                  if (trainUnit(game, 'Footman', 'player')) emitUiSound('ui-button-click');
                }}
                disabled={!canAffordCost(game, UNIT_COSTS.Footman)}
              />
              <HudButton
                label={`Forged Blades (${RESEARCH_COST.forgedBlades.gold}g)`}
                onClick={() => research('forgedBlades')}
                disabled={!canResearch(game.economy.player, game.research, 'forgedBlades')}
              />
              <HudButton
                label={`Steel Plows (${RESEARCH_COST.steelPlows.gold}g)`}
                onClick={() => research('steelPlows')}
                disabled={!canResearch(game.economy.player, game.research, 'steelPlows')}
              />
              <div style={{ fontSize: '0.68rem', color: HUD_THEME.color.muted, marginTop: 6 }}>
                Tap a tile to set the rally point.
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
