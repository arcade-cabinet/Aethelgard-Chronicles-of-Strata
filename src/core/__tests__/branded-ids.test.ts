/**
 * M_FUN.FOUNDATION.BRANDED-IDS — runtime + compile-time pins for
 * the branded id aliases. The compile-time pin is captured via
 * ts-expect-error comments inside the test bodies; tsc would fail
 * `pnpm check` if a brand mismatch ever became valid.
 */
import { describe, expect, it } from 'vitest';
import {
  asEntityId,
  asFactionKey,
  asTileKey,
  type EntityId,
  type FactionKey,
  type TileKey,
} from '../branded-ids';

describe('branded ids', () => {
  it('asTileKey is a no-op at runtime', () => {
    const raw = '3,4';
    const k = asTileKey(raw);
    expect(k).toBe(raw);
  });

  it('asEntityId is a no-op at runtime', () => {
    const n = asEntityId(268435459);
    expect(n).toBe(268435459);
  });

  it('asFactionKey is a no-op at runtime', () => {
    const f = asFactionKey('enemy');
    expect(f).toBe('enemy');
  });

  it('compile-time: TileKey is not assignable to EntityId or vice versa', () => {
    const k = asTileKey('1,2');
    const id = asEntityId(42);
    // @ts-expect-error TileKey shouldn't be assignable to EntityId
    const bad1: EntityId = k;
    // @ts-expect-error EntityId shouldn't be assignable to TileKey
    const bad2: TileKey = id;
    expect(bad1 as unknown).toBe('1,2');
    expect(bad2 as unknown).toBe(42);
  });

  it('compile-time: a plain string is not assignable to FactionKey', () => {
    // @ts-expect-error a raw 'player' string isn't FactionKey without asFactionKey
    const bad: FactionKey = 'player';
    expect(bad as unknown).toBe('player');
  });
});
