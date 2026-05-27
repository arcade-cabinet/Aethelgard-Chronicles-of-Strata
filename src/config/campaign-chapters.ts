/**
 * M_V11.CAMPAIGN (#77g) — narrative chapter registry.
 *
 * Three hand-tuned scenarios. Each ChapterDef carries:
 *   - id: stable enum value (also keys the Atelier unlocks)
 *   - title: display name on the chapter picker
 *   - synopsis: 1-2 sentence lore framing
 *   - seedPhrase: deterministic seed so every player gets the same
 *                  starting map for the chapter
 *   - objectives: scripted ChapterObjective[] driving the
 *                  CampaignOverlay's queue (same step shape as
 *                  the TutorialOverlay)
 *
 * The overlay queries `objectives` and polls their `check` against
 * the live game state every 250ms, advancing on satisfaction —
 * exactly the TutorialOverlay pattern, just driven by the chapter
 * registry instead of a hardcoded array.
 *
 * The chapter-objective check signatures are defined as strings on
 * disk so the registry is JSON-serializable in principle; today
 * each check is a typed function pointer. A future commit can
 * lift this to a JSON-driven step registry once the design pins.
 */
import { Building, FactionTrait, Unit } from '@/ecs/components';
import type { GameState } from '@/game/game-state';

export type ChapterId = 'first-strata' | 'pact-of-kings' | 'necropolis-rising';

export interface ChapterObjective {
  id: string;
  title: string;
  body: string;
  check: (game: GameState) => boolean;
}

export interface ChapterDef {
  id: ChapterId;
  title: string;
  synopsis: string;
  seedPhrase: string;
  objectives: ChapterObjective[];
}

/** Helpers reused across chapter checks. */
function countPlayerBuildings(game: GameState, type: string): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Building)?.buildingType === type) n += 1;
  }
  return n;
}

function countPlayerUnits(game: GameState, type: string): number {
  let n = 0;
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType === type) n += 1;
  }
  return n;
}

export const CAMPAIGN_CHAPTERS: Record<ChapterId, ChapterDef> = {
  'first-strata': {
    id: 'first-strata',
    title: 'Chapter I — The First Strata',
    synopsis:
      'The Aethelgard kingdom is young. Word arrives that barbarian camps stir on the frontier; your first task is to defend the Palace until the warband breaks.',
    seedPhrase: 'first-strata-chapter-1',
    objectives: [
      {
        id: 'train-first-peon',
        title: 'Found your first Peon',
        body: 'Tap your Palace and train a Peon. The kingdom needs hands before it needs swords.',
        check: (g) => countPlayerUnits(g, 'Peon') >= 1,
      },
      {
        id: 'build-barracks',
        title: 'Build a Barracks',
        body: 'The Barracks trains Footmen. Without military, the Palace falls to the first raid.',
        check: (g) => countPlayerBuildings(g, 'Barracks') >= 1,
      },
      {
        id: 'train-three-footmen',
        title: 'Train 3 Footmen',
        body: 'A defending line of three Footmen will break the first wave.',
        check: (g) => countPlayerUnits(g, 'Footman') >= 3,
      },
      {
        id: 'build-watchtower',
        title: 'Build a Watchtower',
        body: 'The Watchtower auto-fires on enemies in range. Place one between your Palace and the frontier.',
        check: (g) => countPlayerBuildings(g, 'Watchtower') >= 1,
      },
      {
        id: 'survive-five-min',
        title: 'Survive the first 5 minutes',
        body: 'The first wave will hit by minute 3. Hold the Palace until the timer crosses 5 min.',
        check: (g) => g.clock.elapsed >= 300,
      },
    ],
  },
  'pact-of-kings': {
    id: 'pact-of-kings',
    title: 'Chapter II — The Pact of Kings',
    synopsis:
      'A second kingdom borders yours. The barbarian threat is greater than either of you alone — broker a pact and clear the camps together.',
    seedPhrase: 'pact-of-kings-chapter-2',
    objectives: [
      {
        id: 'first-contact',
        title: 'Make first contact with the bordering kingdom',
        body: "Build an Embassy or walk a Diplomat into the enemy's zone. Diplomacy unlocks once contact lands.",
        check: (g) => g.diplomacy.relations.size >= 1,
      },
      {
        id: 'open-diplo-modal',
        title: 'Open the Diplomacy modal',
        body: 'Tap the top-right menu → Diplomacy. Propose a 5-minute alliance with the other kingdom.',
        check: (g) => {
          for (const [, rel] of g.diplomacy.relations) {
            if (rel.relation === 'ally') return true;
          }
          return false;
        },
      },
      {
        id: 'train-six-military',
        title: 'Train 6 military units total',
        body: 'A joint expedition needs at least 6 of your own units to back the alliance.',
        check: (g) =>
          countPlayerUnits(g, 'Footman') +
            countPlayerUnits(g, 'Archer') +
            countPlayerUnits(g, 'Pikeman') +
            countPlayerUnits(g, 'Knight') >=
          6,
      },
      {
        id: 'survive-eight-min',
        title: 'Hold the alliance for 8 minutes',
        body: 'The barbarian counter-attacks. Keep the pact alive while the AI ally clears the camps.',
        check: (g) => g.clock.elapsed >= 480,
      },
    ],
  },
  'necropolis-rising': {
    id: 'necropolis-rising',
    title: 'Chapter III — The Necropolis Rising',
    synopsis:
      'The neighboring kingdom has fallen to the necromancers. Across the mountain choke, the Necropolis grows. Forge combined arms and march your Knights through the pass.',
    seedPhrase: 'necropolis-rising-chapter-3',
    objectives: [
      {
        id: 'tech-discoveries',
        title: 'Purchase 3 Discoveries',
        body: 'Open Discoveries from the menu. Pick three — the war ahead is technical as much as martial.',
        check: (g) => g.research.purchased.size >= 3,
      },
      {
        id: 'build-mage-tower',
        title: 'Build a Mage Tower',
        body: "The Necropolis's Wizards out-range Footmen. A Mage Tower auto-fires in a 3-hex radius.",
        check: (g) => countPlayerBuildings(g, 'MageTower') >= 1,
      },
      {
        id: 'train-knight-pikeman',
        title: 'Train at least 1 Knight + 1 Pikeman',
        body: 'Knight heavy-charge + Pikeman anti-cavalry parry are the combined-arms pillar.',
        check: (g) => countPlayerUnits(g, 'Knight') >= 1 && countPlayerUnits(g, 'Pikeman') >= 1,
      },
      {
        id: 'survive-twelve-min',
        title: 'Survive 12 minutes',
        body: 'Hold position through 12 sim-minutes; the Necropolis weakens once its Wonder is destroyed.',
        check: (g) => g.clock.elapsed >= 720,
      },
    ],
  },
};

export const CHAPTER_IDS: ReadonlyArray<ChapterId> = [
  'first-strata',
  'pact-of-kings',
  'necropolis-rising',
];

export function chapterFor(id: ChapterId): ChapterDef {
  return CAMPAIGN_CHAPTERS[id];
}
