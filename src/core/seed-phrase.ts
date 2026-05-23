import type { Rng } from './rng';

/** First-adjective word list — matches poc2's seedAdjectives1. */
const ADJECTIVES_1 = [
  'Grizzled',
  'Frosty',
  'Glowing',
  'Silent',
  'Eldritch',
  'Fabled',
  'Crimson',
  'Golden',
  'Shimmering',
  'Shadowed',
  'Savage',
] as const;

/** Second-adjective word list — matches poc2's seedAdjectives2. */
const ADJECTIVES_2 = [
  'Ancient',
  'Forsaken',
  'Shattered',
  'Forgotten',
  'Untamed',
  'Verdant',
  'Sunken',
  'Haunted',
  'Ironclad',
  'Sacred',
] as const;

/** Noun word list — matches poc2's seedNouns. */
const NOUNS = [
  'Keep',
  'Citadel',
  'Nexus',
  'Peak',
  'Valley',
  'Sanctum',
  'Garrison',
  'Spire',
  'Basin',
  'Ridge',
  'Crag',
  'Cove',
] as const;

/** Pick an element of a non-empty array using a draw from `rng`. */
function pick<T>(list: readonly T[], rng: Rng): T {
  const item = list[Math.floor(rng() * list.length)];
  if (item === undefined) throw new Error('pick from empty list');
  return item;
}

/**
 * Generate a random `adjective-adjective-noun` seed phrase, lower-cased and
 * hyphen-joined (e.g. `ancient-silver-forest`). The shuffle draws from the
 * **event PRNG** — picking a phrase is "just another event" — so there is no
 * `Math.random()` anywhere in the deterministic core. The resulting phrase is
 * the human-facing map seed. See `docs/specs/96-prng-and-landing.md`.
 */
export function randomSeedPhrase(rng: Rng): string {
  return [pick(ADJECTIVES_1, rng), pick(ADJECTIVES_2, rng), pick(NOUNS, rng)]
    .map((w) => w.toLowerCase())
    .join('-');
}
