import { HEX_DIRECTIONS, HEX_RADIUS } from '@/config/world';

/** Round to 3 decimal places — fuses near-identical floating-point corner positions. */
export function round(val: number): number {
  return Math.round(val * 1000) / 1000;
}

/**
 * Convert axial (q, r) to world XZ position. Pointy-top hex layout:
 * `x = √3·R·(q + r/2)`, `z = 1.5·R·r`, matching getHexCorner's -30° corner 0.
 */
export function axialToWorld(q: number, r: number): { x: number; z: number } {
  return {
    x: round(HEX_RADIUS * Math.sqrt(3) * (q + r / 2)),
    z: round(HEX_RADIUS * 1.5 * r),
  };
}

/** World position of corner i (0–5) of a hex centred at (cx, cz). Corner 0 is at -30°. */
export function getHexCorner(cx: number, cz: number, i: number): { x: number; z: number } {
  const a = (Math.PI / 180) * (60 * i - 30);
  return {
    x: round(cx + HEX_RADIUS * Math.cos(a)),
    z: round(cz + HEX_RADIUS * Math.sin(a)),
  };
}

/** Stable string key for an axial coordinate. */
export function getHexKey(q: number, r: number): string {
  return `${q},${r}`;
}

/**
 * Inverse of getHexKey — parses a "q,r" string into axial coords.
 * Returns `{q:0,r:0}` on a malformed key (the caller's invariants
 * usually rule that out — keys are always built via getHexKey).
 *
 * M_MICRO.2.2 — collapses 12 hand-rolled `const [q, r] =
 * key.split(',').map(Number)` patterns scattered across the codebase.
 * `Number(undefined)` is NaN which would silently NaN-poison the
 * caller's hex math; this helper coerces the missing-coord case to 0
 * and centralises that fallback decision.
 */
export function parseHexKey(key: string): { q: number; r: number } {
  // CodeRabbit MED — `q ?? 0` only catches undefined, not NaN. A
  // malformed key like 'abc,def' splits to non-empty strings that
  // Number()s to NaN, which propagates silently through hex math.
  // Number.isFinite catches both cases.
  const [q, r] = key.split(',').map(Number);
  return {
    q: Number.isFinite(q) ? (q as number) : 0,
    r: Number.isFinite(r) ? (r as number) : 0,
  };
}

/**
 * 3-coord variant of parseHexKey — `"q,r,level"`. The pathfinder
 * encodes ramp-step waypoints with an explicit level so the path-
 * follow system knows which tier to land on. M_MICRO.2.2 collapses
 * `path-follow.ts`'s hand-roll into this helper.
 */
export function parseHexLevelKey(key: string): { q: number; r: number; level: number } {
  const [q, r, level] = key.split(',').map(Number);
  return {
    q: Number.isFinite(q) ? (q as number) : 0,
    r: Number.isFinite(r) ? (r as number) : 0,
    level: Number.isFinite(level) ? (level as number) : 0,
  };
}

/**
 * Absolute elevation gap between two tiles. M_MICRO.2.4 — extracts
 * the `Math.abs(a.level - b.level)` pattern duplicated in
 * pathfinding.ts:25 and crossings.ts:85. Both consult elevation deltas
 * with the same shape: "1-tier step (ramp) vs disallowed jump".
 */
export function levelDelta(a: { level: number }, b: { level: number }): number {
  return Math.abs(a.level - b.level);
}

/** Cube-distance between two axial coordinates. */
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const s1 = -q1 - r1;
  const s2 = -q2 - r2;
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
}

/** The six neighbor hex keys of an axial coordinate. */
export function hexNeighbors(q: number, r: number): string[] {
  return HEX_DIRECTIONS.map((d) => getHexKey(q + d.q, r + d.r));
}

/** Whether two hex keys are adjacent (exactly one tile apart). */
export function areAdjacent(keyA: string, keyB: string): boolean {
  if (keyA === keyB) return false;
  const { q, r } = parseHexKey(keyA);
  return hexNeighbors(q, r).includes(keyB);
}
