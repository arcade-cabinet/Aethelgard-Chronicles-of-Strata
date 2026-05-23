/**
 * M_EXPANSION.S.59 — SERIALIZED_TRAITS exhaustiveness gate.
 *
 * Goal: a new trait added to src/ecs/components.ts that affects
 * gameplay state MUST be listed in SERIALIZED_TRAITS or else a
 * save/load loses its data — silently. This test fails loud if any
 * trait export isn't either:
 *   (a) listed in SERIALIZED_TRAITS, or
 *   (b) named in EXCLUDED_FROM_SERIALIZATION below with a one-line reason.
 */
import { describe, expect, it } from 'vitest';
import * as Components from '@/ecs/components';
import { SERIALIZED_TRAITS } from '@/ecs/components';

/**
 * Traits intentionally NOT serialised — each name carries a reason.
 * Keep narrow; the default should be 'add to SERIALIZED_TRAITS'.
 */
const EXCLUDED_FROM_SERIALIZATION: Record<string, string> = {
  // None today. If a trait is render-only (e.g. cosmetic-only or
  // recomputed every tick from sim state), add a row here naming it
  // and the reason.
};

describe('SERIALIZED_TRAITS exhaustiveness (M_EXPANSION.S.59)', () => {
  it('every exported koota trait is either serialised or explicitly excluded', () => {
    const serializedNames = new Set(SERIALIZED_TRAITS.map((t) => t.name));
    const traitExports: string[] = [];
    for (const [name, value] of Object.entries(Components)) {
      // koota's trait() returns a function-like; we look for the call-site
      // shape by checking for the `.schema` field koota stamps onto traits.
      if (!value || typeof value !== 'function') continue;
      const hasKootaShape =
        typeof (value as { schema?: unknown }).schema !== 'undefined' ||
        typeof (value as { id?: unknown }).id === 'number';
      if (!hasKootaShape) continue;
      traitExports.push(name);
    }
    const missing = traitExports.filter(
      (n) => !serializedNames.has(n) && !(n in EXCLUDED_FROM_SERIALIZATION),
    );
    expect(missing, `Unserialised traits: ${missing.join(', ')}`).toEqual([]);
  });
});
