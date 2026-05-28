/**
 * M_V11.TUTORIAL (#77f) — guided first-time-player overlay.
 *
 * When game.mode === 'tutorial', this overlay drives an 8-step
 * objective queue that teaches every core system. Each step has:
 *   - a short instruction (title + body)
 *   - a `check(game)` predicate that evaluates to true once the
 *     player has performed the step's action
 *   - optional ariaLabel for screen readers
 *
 * The overlay polls the game-state every 0.25s; when the active
 * step's check returns true, it advances to the next. After the
 * last step the overlay shows a "you're ready" panel with a
 * "play a real match" button that closes the tutorial cleanly.
 *
 * Not mounted outside tutorial mode — App.tsx guards on game.mode.
 */
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { AssignedJob, Building, FactionTrait, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from '../theme';

export interface TutorialOverlayProps {
  game: GameState;
}

interface TutorialStep {
  id: string;
  title: string;
  body: string;
  check: (game: GameState) => boolean;
}

function countPlayerUnits(game: GameState, unitType: string): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType === unitType) n += 1;
  }
  return n;
}

function countPlayerBuildings(game: GameState, buildingType: string): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Building)?.buildingType === buildingType) n += 1;
  }
  return n;
}

function anyPlayerPeonHarvesting(game: GameState): boolean {
  for (const e of game.world.query(Unit, FactionTrait, AssignedJob)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    const state = e.get(AssignedJob)?.state;
    if (state === 'HARVESTING' || state === 'CARRYING' || state === 'DEPOSITING') return true;
  }
  return false;
}

const STEPS: TutorialStep[] = [
  {
    id: 'queue-peon',
    title: 'Tap your Palace and train a Peon',
    body: 'Your Palace is the gold-trimmed building at the center of your zone. Tap it, then tap "Train Peon".',
    check: (g) => countPlayerUnits(g, 'Peon') >= 1,
  },
  {
    id: 'assign-harvest',
    title: 'Send the Peon to harvest',
    body: 'Tap the Peon, then tap a forest tile to gather wood. Peons return to deposit at the Palace automatically.',
    check: anyPlayerPeonHarvesting,
  },
  {
    id: 'build-farm',
    title: 'Build a Farm',
    body: 'Open the Build menu (bottom-right). Pick Farm and place it on a Grass tile. Farms raise your supply cap.',
    check: (g) => countPlayerBuildings(g, 'Farm') >= 1,
  },
  {
    id: 'build-house',
    title: 'Build a House',
    body: 'Houses raise your Peon cap so you can train more workers. Place one near the Palace.',
    check: (g) => countPlayerBuildings(g, 'House') >= 1,
  },
  {
    id: 'train-footman',
    title: 'Build a Barracks, then train a Footman',
    body: 'Open Build → Barracks. Once it completes, tap the Barracks and train a Footman. You need military to defend your kingdom.',
    check: (g) => countPlayerUnits(g, 'Footman') >= 1,
  },
  {
    id: 'open-discoveries',
    title: 'Open the Discoveries panel',
    body: 'Tap the top-right hamburger menu and choose Discoveries. Discoveries unlock formations, tech, and economy bonuses mid-match.',
    check: (g) => g.research.purchased.size >= 1,
  },
  {
    id: 'open-diplomacy',
    title: 'Open the Diplomacy modal',
    body: 'In the menu, choose Diplomacy. The Diplomacy modal lets you propose pacts, declare war, demand tribute, and form temporary alliances against stronger opponents.',
    check: (g) => g.diplomacy.relations.size >= 1,
  },
  {
    id: 'build-watchtower',
    title: 'Build a Watchtower',
    body: 'Watchtowers auto-fire on enemies in range. Place one between your Palace and the enemy zone for early defense.',
    check: (g) => countPlayerBuildings(g, 'Watchtower') >= 1,
  },
];

const POLL_INTERVAL_MS = 250;

export function TutorialOverlay({ game }: TutorialOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [, setTick] = useState(0);

  // Poll the game state every 0.25s to evaluate the active step's
  // check. A tick state-update forces re-render so the rendered
  // step matches the latest stepIndex.
  useEffect(() => {
    if (game.mode !== 'tutorial') return;
    const interval = setInterval(() => {
      const active = STEPS[stepIndex];
      if (active?.check(game)) {
        setStepIndex((i) => Math.min(i + 1, STEPS.length));
      } else {
        setTick((t) => t + 1);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [game, stepIndex]);

  if (game.mode !== 'tutorial') return null;

  const isComplete = stepIndex >= STEPS.length;
  const step = isComplete ? null : STEPS[stepIndex];

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    bottom: 'calc(var(--safe-bottom) + 80px)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(440px, 92vw)',
    background: HUD_THEME.color.panel,
    border: `2px solid ${HUD_THEME.color.gold ?? '#e4b54b'}`,
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
    zIndex: 200,
    fontFamily: HUD_THEME.font.body,
  };

  return (
    <aside id="tutorial-overlay" aria-label="Tutorial overlay" style={overlayStyle}>
      {isComplete ? (
        <>
          <div
            style={{
              color: HUD_THEME.color.gold ?? '#e4b54b',
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            ✓ Tutorial complete
          </div>
          <p style={{ margin: '0 0 12px', color: HUD_THEME.color.text, fontSize: 13 }}>
            You've learned every core system. Open the menu (top-right) to start a real match.
          </p>
          <button
            type="button"
            id="tutorial-finish-new-game"
            aria-label="Open new game modal"
            onClick={() => window.dispatchEvent(new CustomEvent('aethelgard:open-new-game'))}
            style={{
              padding: '8px 16px',
              background: HUD_THEME.color.accent,
              color: HUD_THEME.color.panel,
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start a real match
          </button>
        </>
      ) : step ? (
        <>
          <div
            style={{
              color: HUD_THEME.color.muted,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Step {stepIndex + 1} / {STEPS.length}
          </div>
          <div
            id={`tutorial-step-title-${step.id}`}
            style={{
              color: HUD_THEME.color.text,
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {step.title}
          </div>
          <p
            id={`tutorial-step-body-${step.id}`}
            style={{
              margin: 0,
              color: HUD_THEME.color.muted,
              fontSize: 13,
              lineHeight: 1.4,
            }}
          >
            {step.body}
          </p>
        </>
      ) : null}
    </aside>
  );
}
