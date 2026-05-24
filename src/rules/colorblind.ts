/**
 * M_EXPANSION.U.113 — colourblind mode.
 *
 * The default Aethelgard palette codes player → green and enemy →
 * red/purple. Red/green is the deuteranopia + protanopia confusion
 * pair (~7-8% of male players, ~0.5% of female). With the colourblind
 * mode on, faction colours are remapped to player → orange + enemy →
 * cyan — a blue/orange pair that survives ALL three common types of
 * dichromatic vision (protan, deutan, tritan).
 *
 * The toggle is module-level + observable: SettingsModal writes via
 * `setColorblindMode`, every renderer reads through `resolveFactionTint`
 * on the next snapshot tick. Subscribers can also `subscribe()` for an
 * immediate forced re-render — but the snapshot pattern in Units.tsx
 * picks the change up naturally on its useFrame poll.
 */
export type FactionId = 'player' | 'enemy';

/** Hex strings (no alpha) so they multiply cleanly into a material. */
const DEFAULT_TINTS: Record<FactionId, string> = {
  player: '#22c55e', // green (matches the SKINS native player armor)
  enemy: '#ef4444', // red (matches the SKINS native enemy armor)
};

const COLORBLIND_TINTS: Record<FactionId, string> = {
  player: '#fb923c', // orange — high contrast vs cyan for all dichromacies
  enemy: '#22d3ee', // cyan
};

let colorblindMode = false;
const listeners = new Set<() => void>();

/** Is colourblind mode currently on? */
export function isColorblindMode(): boolean {
  return colorblindMode;
}

/**
 * Toggle colourblind mode. Notifies subscribers AFTER updating the
 * flag so a listener that calls `isColorblindMode()` sees the new
 * value.
 */
export function setColorblindMode(value: boolean): void {
  if (colorblindMode === value) return;
  colorblindMode = value;
  for (const cb of listeners) cb();
}

/**
 * Subscribe to colourblind-mode toggles. Returns an unsubscribe
 * function. Use this in renderers that don't poll snapshots — most
 * Units.tsx-style snapshot loops can skip the subscription and let
 * the next tick naturally pick up the change.
 */
export function subscribeColorblind(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Resolve the tint for `faction`, applying an OPTIONAL per-player
 * palette override (PlayerColor pick from NewGameModal) and the
 * colourblind global. Precedence:
 *   1. player + custom playerColor (palette pick) → returned as-is
 *      EXCEPT when colourblind mode is on, in which case the
 *      colourblind player tint always wins (accessibility > custom
 *      flair).
 *   2. colourblind mode on → COLORBLIND_TINTS[faction]
 *   3. otherwise → DEFAULT_TINTS[faction]
 */
export function resolveFactionTint(
  faction: FactionId,
  customPlayerColor: string | null = null,
): string {
  if (colorblindMode) return COLORBLIND_TINTS[faction];
  if (faction === 'player' && customPlayerColor) return customPlayerColor;
  return DEFAULT_TINTS[faction];
}

/** Test hook — reset between tests. */
export function _resetColorblindForTests(): void {
  colorblindMode = false;
  listeners.clear();
}
