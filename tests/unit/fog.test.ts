import { describe, expect, it } from 'vitest';
import { FactionBase, FactionTrait, HexPosition, Transform, Unit } from '@/ecs/components';
import { createEcsWorld } from '@/ecs/world';
import { createFogState, tileVisibility, updateFog } from '@/game/fog';

/** A small square of tile coords for vision tests. */
function tileGrid(radius: number): Array<{ q: number; r: number }> {
  const out: Array<{ q: number; r: number }> = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) out.push({ q, r });
  }
  return out;
}

describe('fog of war (M8.4)', () => {
  it('a fresh fog state sees nothing', () => {
    const fog = createFogState();
    expect(fog.visible.size).toBe(0);
    expect(fog.discovered.size).toBe(0);
    expect(tileVisibility(fog, '0,0')).toBe('unknown');
  });

  it('a base reveals a circle of tiles around it', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'player' }), HexPosition({ q: 0, r: 0, level: 1 }));
    const fog = createFogState();
    updateFog(fog, world, 'player', tileGrid(10));
    // the base's own tile and near tiles are visible
    expect(tileVisibility(fog, '0,0')).toBe('visible');
    expect(tileVisibility(fog, '1,0')).toBe('visible');
    // a far tile is unknown
    expect(tileVisibility(fog, '10,0')).toBe('unknown');
  });

  it('only the issuing faction sees its own sources', () => {
    const world = createEcsWorld();
    world.spawn(FactionBase({ faction: 'enemy' }), HexPosition({ q: 0, r: 0, level: 1 }));
    const playerFog = createFogState();
    updateFog(playerFog, world, 'player', tileGrid(10));
    // the player has no sources — sees nothing despite the enemy base
    expect(playerFog.visible.size).toBe(0);
  });

  it('a unit sees a forward cone, not behind it', () => {
    const world = createEcsWorld();
    // a unit at origin facing +Z (rotationY 0 → atan2(dx,dz) bearing 0 is +Z)
    world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    );
    const fog = createFogState();
    updateFog(fog, world, 'player', tileGrid(10));
    // its own tile is always visible
    expect(tileVisibility(fog, '0,0')).toBe('visible');
    // some tile is visible (the cone is non-empty)
    expect(fog.visible.size).toBeGreaterThan(1);
    // the cone does not cover the whole radius-disc — a unit sees less than a base
    const baseWorld = createEcsWorld();
    baseWorld.spawn(FactionBase({ faction: 'player' }), HexPosition({ q: 0, r: 0, level: 1 }));
    const baseFog = createFogState();
    updateFog(baseFog, baseWorld, 'player', tileGrid(10));
    expect(fog.visible.size).toBeLessThan(baseFog.visible.size);
  });

  it('discovered is monotonic — a tile stays known after the source leaves', () => {
    const world = createEcsWorld();
    const unit = world.spawn(
      Unit({ unitType: 'Footman' }),
      FactionTrait({ faction: 'player' }),
      HexPosition({ q: 0, r: 0, level: 1 }),
      Transform({ x: 0, y: 0, z: 0, rotationY: 0 }),
    );
    const fog = createFogState();
    updateFog(fog, world, 'player', tileGrid(10));
    const seen = [...fog.visible];
    expect(seen.length).toBeGreaterThan(0);

    // move the unit far away and re-fog
    unit.set(HexPosition, { q: 30, r: 30, level: 1 });
    updateFog(fog, world, 'player', tileGrid(10));
    // those tiles are no longer visible but remain discovered
    for (const key of seen) {
      expect(fog.visible.has(key)).toBe(false);
      expect(fog.discovered.has(key)).toBe(true);
      expect(tileVisibility(fog, key)).toBe('discovered');
    }
  });
});
