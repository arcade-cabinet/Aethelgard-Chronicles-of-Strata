import worldConfigRaw from '@/config/world.json';

interface WorldConfig {
  dayLength: number;
}

const worldConfig = worldConfigRaw as WorldConfig;

/** Seconds in one full day/night cycle. */
export const DAY_LENGTH: number = worldConfig.dayLength;

/** The game clock — total elapsed game-seconds. */
export interface GameClock {
  /** Total elapsed game seconds. */
  elapsed: number;
}

/** Create a clock at game-time zero. */
export function createClock(): GameClock {
  return { elapsed: 0 };
}

/** Advance the clock by `delta` seconds. Negative deltas are ignored. */
export function advanceClock(clock: GameClock, delta: number): void {
  clock.elapsed += Math.max(0, delta);
}

/** The cycle phase in [0, 1): 0 = dawn, 0.25 = noon, 0.5 = dusk, 0.75 = midnight. */
export function cyclePhase(clock: GameClock): number {
  return (clock.elapsed % DAY_LENGTH) / DAY_LENGTH;
}

/**
 * Directional-light intensity for a cycle phase. A raised cosine peaking at
 * noon (phase 0.25) and bottoming at midnight (0.75), clamped to [0, 1].
 */
export function lightIntensityAt(phase: number): number {
  // cos peaks at phase 0.25 -> shift so cos(0) aligns there; raised cosine is smooth
  const v = Math.cos((phase - 0.25) * 2 * Math.PI);
  return Math.max(0, Math.min(1, (v + 1) / 2));
}

/** A 0–255 RGB triple. */
export interface RgbColor {
  /** Red 0–255. */
  r: number;
  /** Green 0–255. */
  g: number;
  /** Blue 0–255. */
  b: number;
}

/**
 * Sky color (0–255 RGB) for a cycle phase — lerps between night navy (#0f172a)
 * and day blue (#bae6fd) by the light intensity. `intensity` may be passed in
 * to avoid recomputing the cosine when the caller already has it.
 */
export function skyRgbAt(phase: number, intensity = lightIntensityAt(phase)): RgbColor {
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * intensity);
  return {
    r: lerp(0x0f, 0xba),
    g: lerp(0x17, 0xe6),
    b: lerp(0x2a, 0xfd),
  };
}

/** Sky color as a `#rrggbb` hex string for a cycle phase. */
export function skyColorAt(phase: number): string {
  const { r, g, b } = skyRgbAt(phase);
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
