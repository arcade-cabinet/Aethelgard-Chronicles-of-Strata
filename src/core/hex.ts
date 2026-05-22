import { HEX_RADIUS } from './constants';

/** Round to 3 decimal places — fuses near-identical floating-point corner positions. */
export function round(val: number): number {
  return Math.round(val * 1000) / 1000;
}

/** Convert axial (q, r) to world XZ position (flat-top hex orientation). */
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

/** Cube-distance between two axial coordinates. */
export function hexDistance(q1: number, r1: number, q2: number, r2: number): number {
  const s1 = -q1 - r1;
  const s2 = -q2 - r2;
  return (Math.abs(q1 - q2) + Math.abs(r1 - r2) + Math.abs(s1 - s2)) / 2;
}
