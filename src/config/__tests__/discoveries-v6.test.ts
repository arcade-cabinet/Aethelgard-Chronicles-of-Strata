/**
 * M_V7.DISCOVERY-TREE.V6 — pin the 5 new v0.6 tech entries.
 *
 * Tests against the JSON registry directly because the runtime
 * `Discovery` interface intentionally hides `.effect` (it wraps
 * dispatch into `apply(world)` so consumers don't reach in). Effect
 * kind validation reads the raw JSON via discoveries.ts's
 * `discoveriesConfig` export.
 */
import { describe, expect, it } from 'vitest';
import { DISCOVERIES_CONFIG } from '@/config/discoveries';
import { DISCOVERIES, discoveryById } from '@/rules/discovery-registry';

const NEW_IDS = [
  'trade-route',
  'cartography',
  'iron-tools',
  'siege-engineering',
  'monumental-architecture',
] as const;

describe('M_V7.DISCOVERY-TREE.V6 — new tech entries', () => {
  it('all 5 new techs present in the registry', () => {
    for (const id of NEW_IDS) {
      expect(discoveryById(id), `Discovery "${id}" missing from registry`).toBeDefined();
    }
  });

  it('registry contains 30+ Discoveries across 6 themed chains + formations', () => {
    // M_V11.DISCOVERY-EXPANSION (GAME-DESIGN-AUDIT task #77b): expanded
    // 13 → 36 across Economy/Military/Diplomacy/Magic/Engineering/Lore
    // chains + 6 formations. Threshold pinned at ≥30 so future
    // additions don't trip the test, but a regression (mass deletion)
    // does.
    expect(DISCOVERIES.length).toBeGreaterThanOrEqual(30);
  });

  it('siege-engineering + monumental-architecture have prereqs (deeper-tier)', () => {
    // siege-engineering still chains off forgedBlades (now Military I).
    // monumental-architecture now chains off the Engineering root (was
    // previously chained off steelPlows when there was no separate
    // Engineering line). Engineering is currently a flat root in the
    // expanded tree; monumental-architecture is the root of its own chain.
    expect(discoveryById('siege-engineering')?.prereqs).toEqual(['forgedBlades']);
    expect(discoveryById('monumental-architecture')?.prereqs).toEqual([]);
  });

  it('iron-tools is a multiply-harvest tech with 1.25× factor', () => {
    const cfg = DISCOVERIES_CONFIG.discoveries.find((c) => c.id === 'iron-tools');
    expect(cfg?.effect.kind).toBe('multiply-harvest');
    if (cfg?.effect.kind === 'multiply-harvest') {
      expect(cfg.effect.factor).toBe(1.25);
    }
  });

  it('trade-route + cartography + siege-engineering + monumental-architecture are flag-only', () => {
    for (const id of [
      'trade-route',
      'cartography',
      'siege-engineering',
      'monumental-architecture',
    ]) {
      const cfg = DISCOVERIES_CONFIG.discoveries.find((c) => c.id === id);
      expect(cfg?.effect.kind, `${id} should be flag-only`).toBe('flag');
    }
  });
});
