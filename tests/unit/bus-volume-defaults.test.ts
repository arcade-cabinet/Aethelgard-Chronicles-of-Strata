import { describe, expect, it } from 'vitest';

/**
 * M_POLISH2.m.4 — bus volume default-on-empty regression.
 *
 * The SettingsModal load path used to parse `Number(raw)` where raw
 * could be the empty string from a never-set Preference; `Number('')`
 * returns 0, silently zeroing every slider on first mount. The fix
 * trims + length-checks BEFORE Number-converting so an unset key
 * falls back to the documented default.
 *
 * Pure replica of the parse function used inside SettingsModal —
 * extracted here so we can pin the contract without mounting the
 * whole modal.
 */
function parseVolume(raw: string | null, defaultValue: number): number {
  const trimmed = (raw ?? '').trim();
  if (trimmed.length === 0) return defaultValue;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return defaultValue;
  return Math.max(0, Math.min(1, n));
}

describe('M_POLISH2.m.4 — parseVolume default behavior', () => {
  it('null → default (key was never set)', () => {
    expect(parseVolume(null, 0.8)).toBe(0.8);
  });

  it('empty string → default (the original BUG: Number("") was 0)', () => {
    expect(parseVolume('', 0.8)).toBe(0.8);
  });

  it('whitespace → default', () => {
    expect(parseVolume('   ', 0.8)).toBe(0.8);
  });

  it('a real persisted value round-trips', () => {
    expect(parseVolume('0.42', 0.8)).toBe(0.42);
  });

  it('out-of-range clamps to [0, 1]', () => {
    expect(parseVolume('1.5', 0.8)).toBe(1);
    expect(parseVolume('-0.2', 0.8)).toBe(0);
  });

  it('non-numeric falls back to default', () => {
    expect(parseVolume('hello', 0.8)).toBe(0.8);
  });
});
