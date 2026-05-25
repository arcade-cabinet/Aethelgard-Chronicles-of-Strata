/**
 * M_PIVOT.N-PLAYER.COLOR-PICKER — the 12-color base palette.
 *
 * Each faction slot picks one chip; the default is a deterministic
 * shuffled permutation so a 4-player setup gets four DISTINCT colors
 * without the user picking one-by-one. Click any chip opens the
 * picker; the player may also paste an arbitrary CSS hex via the
 * input below the grid.
 *
 * Palette picks are inspired by Radix UI's accessible 12-step
 * accent scales (step 9, the "solid" tone) so chips render legibly
 * on the dark HUD background AND as ZoneBorder strokes.
 */

export interface PaletteChip {
  /** Stable id used for settings + analytics. */
  id: string;
  /** CSS hex color (lowercase, no alpha). */
  color: string;
  /** Human-readable name (accessible labels). */
  label: string;
}

/**
 * The base palette — 12 visually distinct accents. Order matters for
 * the default shuffled permutation (the first N entries supply the
 * default colors for N faction slots).
 */
export const FACTION_PALETTE: readonly PaletteChip[] = [
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'green', color: '#22c55e', label: 'Green' },
  { id: 'gold', color: '#f59e0b', label: 'Gold' },
  { id: 'magenta', color: '#ec4899', label: 'Magenta' },
  { id: 'mauve', color: '#a855f7', label: 'Mauve' },
  { id: 'mint', color: '#10b981', label: 'Mint' },
  { id: 'plum', color: '#9333ea', label: 'Plum' },
  { id: 'amber', color: '#fbbf24', label: 'Amber' },
  { id: 'sky', color: '#0ea5e9', label: 'Sky' },
  { id: 'slate', color: '#94a3b8', label: 'Slate' },
  { id: 'teal', color: '#14b8a6', label: 'Teal' },
] as const;

/**
 * Pick N default colors from the palette using a seeded shuffle so
 * two factions at the same seed always get the same default pair (and
 * no two factions in a single match share the same color).
 *
 * Determinism: uses a tiny Lehmer LCG seeded off the seed phrase so
 * unit tests can pin defaults without importing seedrandom into HUD.
 *
 * @param n           - How many colors to return (1..12).
 * @param seedPhrase  - The match seed phrase; same input → same shuffle.
 */
export function defaultFactionColors(n: number, seedPhrase: string): string[] {
  if (n <= 0) return [];
  const clamped = Math.min(n, FACTION_PALETTE.length);
  // Lehmer LCG — deterministic, tiny, no deps.
  let state = 1;
  for (let i = 0; i < seedPhrase.length; i++) {
    state = (state * 48271 + seedPhrase.charCodeAt(i)) % 0x7fffffff;
    if (state === 0) state = 1;
  }
  const shuffled = [...FACTION_PALETTE];
  for (let i = shuffled.length - 1; i > 0; i--) {
    state = (state * 48271) % 0x7fffffff;
    const j = state % (i + 1);
    const tmp = shuffled[i] as PaletteChip;
    shuffled[i] = shuffled[j] as PaletteChip;
    shuffled[j] = tmp;
  }
  return shuffled.slice(0, clamped).map((c) => c.color);
}

/**
 * Validate that a string is a valid CSS hex color. Accepts #RGB,
 * #RRGGBB. Used by FactionColorPicker's free-text input. Returns the
 * NORMALIZED 7-char `#rrggbb` form (lowercased + #-prefixed) on
 * success; null on invalid input.
 */
export function normalizeHexColor(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;
  if (/^#[0-9a-f]{3}$/.test(withHash)) {
    // expand short to long form
    const c1 = withHash[1];
    const c2 = withHash[2];
    const c3 = withHash[3];
    return `#${c1}${c1}${c2}${c2}${c3}${c3}`;
  }
  if (/^#[0-9a-f]{6}$/.test(withHash)) return withHash;
  return null;
}
