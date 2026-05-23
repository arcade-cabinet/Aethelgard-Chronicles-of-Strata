import { describe, expect, it } from 'vitest';
import { advanceProjectiles, type Projectile, spawnProjectile } from '@/game/projectiles';

describe('projectile FX (M_COMBAT_POLISH.1)', () => {
  it('spawnProjectile appends with monotonic ids', () => {
    const list: Projectile[] = [];
    const ref = { current: 0 };
    spawnProjectile(list, ref, { x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 5 });
    spawnProjectile(list, ref, { x: 1, y: 0, z: 0 }, { x: 6, y: 0, z: 5 });
    expect(list.length).toBe(2);
    expect(list[0]?.id).toBe(0);
    expect(list[1]?.id).toBe(1);
    expect(list[0]?.kind).toBe('arrow');
  });

  it('advanceProjectiles removes expired entries', () => {
    const list: Projectile[] = [];
    const ref = { current: 0 };
    spawnProjectile(list, ref, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 'arrow', 0.2);
    expect(list.length).toBe(1);
    advanceProjectiles(list, 0.1);
    expect(list.length).toBe(1); // not yet expired
    advanceProjectiles(list, 0.2);
    expect(list.length).toBe(0); // age > lifetime → removed
  });

  it('advanceProjectiles returns true only when something was removed', () => {
    const list: Projectile[] = [];
    const ref = { current: 0 };
    spawnProjectile(list, ref, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, 'arrow', 1);
    expect(advanceProjectiles(list, 0.1)).toBe(false);
    expect(advanceProjectiles(list, 2)).toBe(true);
  });
});
