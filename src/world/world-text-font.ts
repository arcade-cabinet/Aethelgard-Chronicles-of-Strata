/**
 * Self-hosted web fonts for the game.
 *
 * Per user mandate (2026-05-24): "you need a proper set of google web
 * fonts for headers and body text DOWNLOADED to public/assets/fonts".
 *
 * Three TTFs in public/assets/fonts/:
 *   - Cinzel-Regular.ttf / Cinzel-Bold.ttf   — fantasy header serif
 *   - Inter-Regular.ttf / Inter-Bold.ttf     — clean body sans
 *   - Metamorphous-Regular.ttf               — ornate accent serif
 *
 * troika-three-text (drei's <Text> engine) defaults to fetching Roboto
 * from Google Fonts; our CSP `font-src 'self'` blocks that, leaving
 * every world-space text node EMPTY + the WebGL context occasionally
 * LOST on the font-load failure cascade. Every <Text> must pass
 * `font={WORLD_TEXT_FONT}` to read the local TTF instead of the CDN.
 *
 * NO silent fallbacks: if any of these 404, the ErrorOverlay catches
 * it + the user sees the failure on screen.
 */

// Use absolute path resolved against the Vite base. The /assets/fonts/
// directory ships under the public root.
const BASE = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '');

export const FONT_INTER_REGULAR = `${BASE}/assets/fonts/Inter-Regular.ttf`;
export const FONT_INTER_BOLD = `${BASE}/assets/fonts/Inter-Bold.ttf`;
export const FONT_CINZEL_REGULAR = `${BASE}/assets/fonts/Cinzel-Regular.ttf`;
export const FONT_CINZEL_BOLD = `${BASE}/assets/fonts/Cinzel-Bold.ttf`;
export const FONT_METAMORPHOUS = `${BASE}/assets/fonts/Metamorphous-Regular.ttf`;

/** Default font for in-world <Text /> labels — body weight. */
export const WORLD_TEXT_FONT = FONT_INTER_BOLD;
