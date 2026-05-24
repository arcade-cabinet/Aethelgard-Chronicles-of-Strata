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

/**
 * The five TTFs that MUST exist + be valid TrueType. The asset-ingest
 * pipeline (and any future asset migration) must never let an HTML
 * 404 page sneak in as `*.ttf` — when troika-three-text parses such
 * a file, it throws synchronously on first <Text> render and tears
 * down the entire r3f Scene with it. The validator below runs once
 * at app boot, fetches each URL, checks the magic bytes, and pushes
 * a console.error (caught by ErrorOverlay) if any file is broken.
 */
const ALL_FONTS: ReadonlyArray<{ name: string; url: string }> = [
  { name: 'Inter-Regular', url: FONT_INTER_REGULAR },
  { name: 'Inter-Bold', url: FONT_INTER_BOLD },
  { name: 'Cinzel-Regular', url: FONT_CINZEL_REGULAR },
  { name: 'Cinzel-Bold', url: FONT_CINZEL_BOLD },
  { name: 'Metamorphous', url: FONT_METAMORPHOUS },
];

/** TrueType (0x00010000), OpenType ('OTTO'), and TTC ('ttcf') magics. */
const TTF_MAGICS = new Set(['00010000', '4f54544f', '74746366']);

let validationStarted = false;
/**
 * Fetch each TTF, read first 4 bytes, validate against the known
 * TrueType / OpenType magics. Any broken file → console.error → the
 * ErrorOverlay surfaces the failure to the player. Idempotent — safe
 * to call multiple times.
 */
export function validateWorldFonts(): void {
  if (validationStarted) return;
  validationStarted = true;
  for (const { name, url } of ALL_FONTS) {
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`${name} HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 4) throw new Error(`${name} truncated (${buf.byteLength}B)`);
        const head = Array.from(new Uint8Array(buf, 0, 4))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        if (!TTF_MAGICS.has(head)) {
          throw new Error(
            `${name} is NOT a TrueType/OpenType font (magic=0x${head}, ` +
              `expected 00010000 / 4f54544f / 74746366). Re-download from ` +
              `https://cdn.jsdelivr.net/fontsource/fonts/<family>@latest/latin-<weight>-normal.ttf`,
          );
        }
      })
      .catch((err) => {
        console.error('[world-text-font] validation failed:', err);
      });
  }
}
