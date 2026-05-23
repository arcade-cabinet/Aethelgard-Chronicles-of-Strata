/**
 * Projectile list operations regression (M_AUDIT2.ARCH.45).
 *
 * Pins spawnProjectile id allocation + advanceProjectiles age/cull
 * behaviour + return-changed contract.
 */
import { describe, expect, it } from 'vitest';
import { advanceProjectiles, type Projectile, spawnProjectile } from '@/game/projectiles';

const ORIGIN = { x: 0, y: 0, z: 0 };
const TARGET = { x: 1, y: 0, z: 1 };

describe('projectiles', () => {
  it('spawnProjectile increments nextId.current and appends', () => {
    const list: Projectile[] = [];
    const nextId = { current: 5 };
    spawnProjectile(list, nextId, ORIGIN, TARGET);
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe(5);
    expect(nextId.current).toBe(6);
    spawnProjectile(list, nextId, ORIGIN, TARGET);
    expect(list[1]?.id).toBe(6);
    expect(nextId.current).toBe(7);
  });

  it('spawnProjectile defaults to arrow + 0.4s lifetime', () => {
    const list: Projectile[] = [];
    spawnProjectile(list, { current: 0 }, ORIGIN, TARGET);
    expect(list[0]?.kind).toBe('arrow');
    expect(list[0]?.lifetime).toBe(0.4);
  });

  it('spawnProjectile records source + target coords', () => {
    const list: Projectile[] = [];
    spawnProjectile(list, { current: 0 }, { x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 });
    expect(list[0]).toMatchObject({ sx: 1, sy: 2, sz: 3, tx: 4, ty: 5, tz: 6 });
  });

  it('advanceProjectiles ages each entry', () => {
    const list: Projectile[] = [];
    spawnProjectile(list, { current: 0 }, ORIGIN, TARGET);
    advanceProjectiles(list, 0.1);
    expect(list[0]?.age).toBeCloseTo(0.1, 5);
  });

  it('advanceProjectiles culls entries past lifetime + returns true', () => {
    const list: Projectile[] = [];
    spawnProjectile(list, { current: 0 }, ORIGIN, TARGET, 'arrow', 0.2);
    spawnProjectile(list, { current: 1 }, ORIGIN, TARGET, 'arrow', 0.5);
    const changed = advanceProjectiles(list, 0.3);
    expect(changed).toBe(true);
    expect(list.length).toBe(1);
    // The surviving projectile is the 0.5s one.
    expect(list[0]?.lifetime).toBe(0.5);
  });

  it('advanceProjectiles returns false when nothing culled', () => {
    const list: Projectile[] = [];
    spawnProjectile(list, { current: 0 }, ORIGIN, TARGET, 'arrow', 1.0);
    const changed = advanceProjectiles(list, 0.1);
    expect(changed).toBe(false);
    expect(list.length).toBe(1);
  });
});
