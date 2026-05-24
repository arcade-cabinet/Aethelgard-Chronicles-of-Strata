/**
 * M_POLISH2.RTS.21 — choke-point defender bonus.
 *
 * A "choke" is a tile with ≤ CHOKE_MAX_NEIGHBOURS passable neighbours
 * (default 2). Defender's damage reduction applies when a friendly
 * unit stands on a choke — it gives the LOSING-NUMBERS side a
 * narrow-pass payoff, like Thermopylae.
 *
 * Definitions kept tile-local (no zone-of-control dependency) so the
 * math doesn't recompute on every tick — the only inputs are the
 * static board topology + the per-tile walkability bit, both of
 * which are immutable after map gen.
 *
 * Damage reduction is multiplicative: `dealt *= 1 - CHOKE_REDUCTION`.
 * Stacks with other multipliers (terrain bonus, parry, weather miss)
 * at combat-resolution time.
 */
export const CHOKE_MAX_NEIGHBOURS = 2;
export const CHOKE_REDUCTION = 0.1;

/**
 * Compute the defender's damage multiplier given the passable-neighbour
 * count of their tile. Returns `1 - CHOKE_REDUCTION` (0.9) when the
 * tile qualifies as a choke, otherwise 1.0 (no reduction).
 *
 * The CALLER (combat.ts) is responsible for counting passable
 * neighbours from the board topology — keeping that responsibility
 * outside this module means the math is reusable for the SCOUT
 * unit's vision-cone (which also wants neighbour counts).
 */
export function chokePointMultiplier(passableNeighbourCount: number): number {
  return passableNeighbourCount <= CHOKE_MAX_NEIGHBOURS ? 1 - CHOKE_REDUCTION : 1;
}

/** HUD-pill label for the active multiplier, or null when none. */
export function chokePointLabel(multiplier: number): string | null {
  if (multiplier < 1) return `🛡 Choke -${Math.round((1 - multiplier) * 100)}% taken`;
  return null;
}
