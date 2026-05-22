import seedrandom from 'seedrandom';

/** A seeded, deterministic random function returning a float in [0, 1). */
export type Rng = () => number;

/**
 * cyrb128 — a 128-bit non-cryptographic string hash. Produces four 32-bit
 * unsigned integers used to seed a PRNG stream from a string.
 */
export function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/**
 * Build the **map PRNG** from an adjective-adjective-noun seed phrase. Drives
 * board terrain, biomes, and resource placement. The contract is absolute:
 * the same phrase always produces the same map. See `docs/specs/96-prng-and-landing.md`.
 */
export function createMapPrng(seedPhrase: string): Rng {
  const [a, b] = cyrb128(seedPhrase);
  return seedrandom(`${a}.${b}`);
}

/**
 * Build an **event PRNG** stream from a seed string. Drives combat variance,
 * loot, weather, raid timing, and the seed-phrase shuffle — everything random
 * except Yuka's internal AI jitter. The event seed is minted fresh per New
 * Game and buried with the committed session, independent of the map phrase.
 * See `docs/specs/96-prng-and-landing.md`.
 */
export function createEventPrng(eventSeed: string): Rng {
  const [a, b, c, d] = cyrb128(eventSeed);
  return seedrandom(`${a}.${b}.${c}.${d}`);
}

/**
 * Generate a fresh, purely-random event seed string. Called when the New Game
 * modal opens — each open yields an entirely new event PRNG, so the suggested
 * seed phrase (an event draw) genuinely differs every time. Uses
 * `crypto.getRandomValues`, the one allowed non-determinism: it seeds a PRNG,
 * it is not simulation logic.
 */
export function createFreshEventSeed(): string {
  const buf = new Uint32Array(4);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((n) => n.toString(36))
    .join('');
}

/**
 * Derive a successor event seed by drawing from a running event stream — a
 * deterministic way to fork a child seed from a parent.
 */
export function advanceEventSeed(eventRng: Rng): string {
  return [eventRng(), eventRng(), eventRng(), eventRng()]
    .map((n) => Math.floor(n * 0x100000000).toString(36))
    .join('');
}
