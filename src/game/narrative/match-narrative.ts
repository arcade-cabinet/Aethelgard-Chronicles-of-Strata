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
import type { GameState } from '../game-state';

/**
 * M_FUN.NAR.HIGHLIGHTS — derive "story moments" from the running
 * match. Today's matchHighlights reads point-in-time state at
 * outcome-flip; this richer scan looks at the running game.economy
 * + game.score deltas + the most-recent damage burst to surface
 * three classic narrative beats:
 *
 *   - Longest sustained engagement (high damage in N consecutive
 *     ticks)
 *   - Biggest comeback (score swap from underwater to ahead)
 *   - Lopsided kill (one tick produced K > THRESHOLD kills)
 *
 * The narrative card surfaces 1-3 detected beats; if none, it
 * falls back to the state-derived matchHighlights output.
 *
 * Determinism: reads only game state, no Math.random / Date.now.
 */
export interface MatchHighlight {
  kind: 'long-engagement' | 'biggest-comeback' | 'lopsided-kill';
  detail: string;
}

export function detectTranscriptHighlights(game: GameState): MatchHighlight[] {
  const out: MatchHighlight[] = [];
  // Lopsided kill: lastDamageEvents on the final tick had >=3 actual
  // kills (a hit that dropped the target to 0 HP). Coderabbit MAJOR
  // PR #10 04:56Z: the prior filter `damage > 0` counted hits, so a
  // burst-fire spell landing 3 ticks on one Footman tripped the
  // highlight. `isKill` is set in combat.ts apply-pass on the last
  // event per killed target — kill credit goes to the final blow.
  const lethal = game.lastDamageEvents.filter((e) => e.isKill).length;
  if (lethal >= 3) {
    out.push({
      kind: 'lopsided-kill',
      detail: `A lopsided strike: ${lethal} kills in one engagement.`,
    });
  }
  // Long engagement: total combat damage history is proxied by
  // total kill count vs match length. > 1 kill/min sustained =
  // long campaign.
  const totalKills = game.economy.player.kills + game.economy.enemy.kills;
  const elapsedMin = Math.max(1, Math.round(game.clock.elapsed / 60));
  if (totalKills / elapsedMin > 1) {
    out.push({
      kind: 'long-engagement',
      detail: `A grinding campaign: ${totalKills} casualties across ${elapsedMin} minutes.`,
    });
  }
  // Biggest comeback: player score now exceeds enemy by >50% with
  // both having held the lead at some point (proxy: both scores
  // are non-zero with the player ahead).
  const ps = Math.round(game.score.player);
  const es = Math.round(game.score.enemy);
  if (ps > 0 && es > 0 && ps > es * 1.5) {
    out.push({
      kind: 'biggest-comeback',
      detail: `A turning of the tide: territory swung from contested to ${ps}-${es}.`,
    });
  } else if (es > 0 && ps > 0 && es > ps * 1.5) {
    out.push({
      kind: 'biggest-comeback',
      detail: `The enemy clawed back from behind to a ${es}-${ps} territory lead.`,
    });
  }
  return out;
}

import { z } from 'zod';
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
// M_FUN.ECON.JSON-NARRATIVE — word pools sourced from
// `src/config/match-narrative.json` (Zod-validated). Adding a new
// adjective or subject = one JSON entry; no code edit needed.
// The hand-typed pools were inlined in this file pre-v0.5 (see git
// blame); the JSON-first sweep lifted them into config alongside
// resources/eras/world.
import matchNarrativeJson from '@/config/narrative/match-narrative.json';

const MatchNarrativeSchema = z.object({
  adjectives: z.object({
    victory: z.array(z.string()).min(1),
    defeat: z.array(z.string()).min(1),
    draw: z.array(z.string()).min(1),
  }),
  subjects: z.array(z.string()).min(1),
});

function stripNarrativeComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripNarrativeComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripNarrativeComments(v);
    }
    return out;
  }
  return input;
}

const _narrative = MatchNarrativeSchema.parse(stripNarrativeComments(matchNarrativeJson));
const ADJECTIVES_VICTORY = _narrative.adjectives.victory;
const ADJECTIVES_DEFEAT = _narrative.adjectives.defeat;
// Reviewer-fix (CRITICAL #1 / draw fell to defeat pool): explicit
// pool for draws so the nickname matches the modal's "Draw!" title.
const ADJECTIVES_DRAW = _narrative.adjectives.draw;
const SUBJECTS = _narrative.subjects;

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

function countCompleteBuildings(game: GameState, faction: 'player' | 'enemy'): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(Building)?.isComplete && e.get(FactionTrait)?.faction === faction) n += 1;
  }
  return n;
}
