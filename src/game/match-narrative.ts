/**
 * M_FUN.NAR — match narrative.
 *
 * Two outputs:
 *   1. matchNickname(game, seed) — procedural "story of the match"
 *      name based on defining moments + the seed phrase.
 *   2. matchHighlights(game) — 1-3 sentence post-match summary
 *      derived from the recorded state at outcome-flip time.
 *
 * Both functions are PURE — no game-state mutation, no DOM. The
 * GameOverModal calls them once the outcome lands.
 */
import { Building, FactionTrait } from '@/ecs/components';
import type { GameState } from './game-state';

/**
 * Procedural match nickname. Format: "The <Adjective> of <Subject>".
 * Adjective is picked from a small word-bank indexed by the seed
 * phrase hash; Subject is the loser's faction name or a defining
 * tile/region phrase. Examples:
 *   - "The Burning of Eastwall"
 *   - "The Long Quiet Winter"
 *   - "The Reign of the Patient Builder"
 *
 * Determinism: same seedPhrase + outcome → same nickname. Used in
 * the post-match summary card AND saved alongside the save record
 * so future save-list UI can show match nicknames at a glance.
 */
const ADJECTIVES_VICTORY = [
  'Glorious',
  'Crushing',
  'Patient',
  'Sudden',
  'Inevitable',
  'Forgotten',
  'Hard-Won',
  'Defiant',
];
const ADJECTIVES_DEFEAT = [
  'Bitter',
  'Doomed',
  'Final',
  'Lonely',
  'Tragic',
  'Stubborn',
  'Cursed',
  'Quiet',
];
// Reviewer-fix (CRITICAL #1 / draw fell to defeat pool): explicit
// pool for draws so the nickname matches the modal's "Draw!" title.
const ADJECTIVES_DRAW = [
  'Balanced',
  'Even-Handed',
  'Twin',
  'Mirrored',
  'Stalemate',
  'Steady',
  'Equal',
  'Echoed',
];
const SUBJECTS = [
  'Realm',
  'Hill',
  'Spire',
  'Marsh',
  'Tide',
  'Crown',
  'Banner',
  'Pact',
  'Wolf',
  'Hearth',
  'Reach',
  'Storm',
];

function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function matchNickname(game: Pick<GameState, 'seedPhrase' | 'outcome'>): string {
  // Reviewer-fix (HIGH #4 — subject correlated with adjective):
  // derive two INDEPENDENT hashes so adjective and subject can be
  // chosen without aliasing. Salting the seed with ':adj' / ':sub'
  // is enough — FNV-1a fans out single-bit input changes.
  const hAdj = hash32(`${game.seedPhrase}:${game.outcome}:adj`);
  const hSub = hash32(`${game.seedPhrase}:${game.outcome}:sub`);
  // Reviewer-fix (CRITICAL #1 — 'draw' fell to defeat pool): explicit
  // three-way pool selection so a draw renders matching language.
  const adjPool =
    game.outcome === 'win'
      ? ADJECTIVES_VICTORY
      : game.outcome === 'draw'
        ? ADJECTIVES_DRAW
        : ADJECTIVES_DEFEAT;
  const adj = adjPool[hAdj % adjPool.length];
  const subject = SUBJECTS[hSub % SUBJECTS.length];
  return `The ${adj} ${subject}`;
}

/**
 * Match highlights. Selects 1-3 noteworthy facts about the recorded
 * match state and formats them as flavoured sentences. Reads only
 * game.economy + game.clock + game.zones — no transcript needed for
 * the v0.4 version (M_FUN.NAR.HIGHLIGHTS will extend this with
 * transcript-derived 'longest engagement' / 'biggest comeback' / etc).
 */
export function matchHighlights(game: GameState): string[] {
  const lines: string[] = [];
  const elapsedMin = Math.floor(game.clock.elapsed / 60);
  const kills = game.economy.player.kills;
  const buildings = countCompleteBuildings(game, 'player');
  const enemyKills = game.economy.enemy.kills;
  if (elapsedMin >= 10) {
    lines.push(`A long campaign — ${elapsedMin} minutes of conflict.`);
  } else if (elapsedMin <= 2) {
    lines.push('A swift and decisive engagement.');
  }
  // Reviewer-fix (MED #7): pluralise 'kill' / 'loss' grammatically.
  const p = (n: number, singular: string, plural: string) =>
    n === 1 ? `${n} ${singular}` : `${n} ${plural}`;
  if (kills > 0 && kills > enemyKills * 1.5) {
    lines.push(`Your forces overwhelmed the enemy with ${p(kills, 'kill', 'kills')}.`);
  } else if (enemyKills > 0 && enemyKills > kills * 1.5) {
    lines.push(
      `The enemy bled your forces dry — ${p(enemyKills, 'loss', 'losses')} to their ${p(kills, 'kill', 'kills')}.`,
    );
  }
  if (buildings >= 8) {
    lines.push(`A builder's reign — ${buildings} structures standing.`);
  } else if (buildings <= 2) {
    lines.push('Few stones laid; this was a war of armies, not foundations.');
  }
  if (lines.length === 0) {
    lines.push('An even-handed match.');
  }
  return lines;
}

function countCompleteBuildings(
  game: GameState,
  faction: 'player' | 'enemy',
): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(Building)?.isComplete && e.get(FactionTrait)?.faction === faction) n += 1;
  }
  return n;
}
