/**
 * Projectile FX (M_COMBAT_POLISH.1) — purely a presentation layer. Damage is
 * already applied immediately by offensive-behavior.ts; this list lets the
 * renderer animate visible arrows / bolts source→target as feedback so the
 * player can SEE who's shooting at whom.
 *
 * Each entry is a transient world-space tween: start XYZ, target XYZ, age,
 * lifetime. The renderer (`ProjectileLayer`) advances `age`, lerps along the
 * arc, and drops expired entries.
 */
export interface Projectile {
  /** Stable id used as the React key. */
  id: number;
  /** World start. */
  sx: number;
  sy: number;
  sz: number;
  /** World target. */
  tx: number;
  ty: number;
  tz: number;
  /** Seconds elapsed since spawn. */
  age: number;
  /** Total lifetime in seconds. */
  lifetime: number;
  /** Projectile kind — drives the visual (arrow/bolt/magic). Extensible. */
  kind: 'arrow' | 'bolt' | 'magic';
}

/** Add a projectile to the active list. */
export function spawnProjectile(
  list: Projectile[],
  nextId: { current: number },
  start: { x: number; y: number; z: number },
  target: { x: number; y: number; z: number },
  kind: Projectile['kind'] = 'arrow',
  lifetime = 0.4,
): void {
  list.push({
    id: nextId.current++,
    sx: start.x,
    sy: start.y,
    sz: start.z,
    tx: target.x,
    ty: target.y,
    tz: target.z,
    age: 0,
    lifetime,
    kind,
  });
}

/** Advance the list and remove expired entries. Returns whether the list changed. */
export function advanceProjectiles(list: Projectile[], delta: number): boolean {
  let removed = 0;
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i] as Projectile;
    p.age += delta;
    if (p.age >= p.lifetime) {
      list.splice(i, 1);
      removed += 1;
    }
  }
  return removed > 0;
}
