import { describe, expect, it } from 'vitest';
import { characterMeshId, rigAnimationIds, rigForRole } from '../rig';

describe('rig mapping', () => {
  it('maps medium-rig roles to the medium tier', () => {
    expect(rigForRole('Peon')).toBe('medium');
    expect(rigForRole('Footman')).toBe('medium');
    expect(rigForRole('Goblin')).toBe('medium');
  });

  it('maps the Orc to the large tier', () => {
    expect(rigForRole('Orc')).toBe('large');
  });

  it('resolves the two rig animation library ids for a tier', () => {
    expect(rigAnimationIds('medium')).toEqual({
      movement: 'characters.rigs.medium-movement',
      general: 'characters.rigs.medium-general',
    });
    expect(rigAnimationIds('large')).toEqual({
      movement: 'characters.rigs.large-movement',
      general: 'characters.rigs.large-general',
    });
  });

  it('resolves a character mesh id for every unit role', () => {
    expect(characterMeshId('Peon')).toBe('characters.heroes.engineer');
    expect(characterMeshId('Footman')).toBe('characters.heroes.knight');
    expect(characterMeshId('Goblin')).toBe('characters.heroes.rogue');
    expect(characterMeshId('Orc')).toBe('characters.enemies.orc');
  });
});
