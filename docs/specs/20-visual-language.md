# Visual Language

## Aesthetic

Low-poly diorama board game. Tiles are chunky, distinct physical-looking pieces. No
mesh blending at edges — each tile is self-contained. Flat shading on all geometry
(Three.js `flatShading: true`, `roughness: 0.9`, `metalness: 0.05`). The goal is the
tactile feel of holding a wooden game token, not photorealism.

Reference targets:
- **Catan** — chunky, recognizable tile types; each biome is instantly legible from
  above. The "what biome is this?" question must be answerable in one glance.
- **Monument Valley** — terraced strata, the vertical silhouette of stacked platforms
  is the dominant visual motif. Elevation is read as a stack of colored pancakes.
- **Animal Crossing: New Horizons** — each biome has a strong identity. Forest feels
  like forest. Beach feels like beach. There is no muddy ambiguity at borders.

## Biome Color Palette

Source: `references/poc1.html` lines 143–148. These are the canonical, locked colors.
Any deviation is a bug.

| Biome | Hex Color | Description |
|---|---|---|
| `OCEAN` | `#0ea5e9` | Sky blue, deep water |
| `LAKE` | `#38bdf8` | Lighter blue, inland water |
| `BEACH` | `#fde047` | Warm yellow sand |
| `DESERT` | `#d97706` | Amber, dry arid ground |
| `GRASS` | `#84cc16` | Vivid lime green |
| `FOREST` | `#15803d` | Dark, dense green |
| `HIGHLAND` | `#64748b` | Cool slate grey |
| `MOUNTAIN` | `#475569` | Dark slate, rocky peaks |

Snow caps: level-6 tiles lerp 80% toward `#f8fafc` (near-white), regardless of biome.

Cliff faces (the exposed sides of elevated tiles): `#334155` for highlands/mountains,
`#92400e` for desert, `#78350f` for all other biomes (earthy brown).

Grass and Forest biomes apply a moisture-based lerp toward `#22c55e` to vary internal
hue — high-moisture forest reads darker and richer than dry scrubland.

## Implied Grid

Tiles are sized to touch but not overlap. There are no drawn grid lines. The visual
gap comes from the color contrast between adjacent biomes, cliff face geometry between
elevation tiers, and the slight height difference at the edge of plateaus. If two
same-elevation same-biome tiles are adjacent, no gap is visible — that is correct and
intended.

**Do not** render wireframes, outlines, or explicit grid overlays. The grid is implied
by geometry alone.

## Flat Shading Rule

All terrain, building, and prop geometry uses `MeshStandardMaterial` with
`flatShading: true`. This is non-negotiable — the low-poly diorama look depends on
visible polygon faces, not smooth interpolated normals. KayKit character materials may
use smooth shading if the rig requires it, but should be tested to confirm visual fit.

## HUD Typography

Source: `references/poc2.html` line 8 (Google Fonts link) and CSS throughout.

- **Headings / branding / buttons:** `Metamorphous` (serif). Used for the game title,
  the seed-setup heading, the "Enter Realm" button, panel section headers, and modal
  titles. Communicates fantasy and weight.
- **Body / data / labels:** `Inter` (sans-serif, weights 400 / 600 / 700 / 800 / 900).
  Used for resource counts, unit names, task descriptions, stat lines, and all
  interactive button text. Communicates clarity and legibility at small sizes.

Load order: Google Fonts CDN at document head, with `display=swap`. No local font
files required.

## CSS Design Tokens

Source: `references/poc2.html` lines 14–26 (`:root` block).

```css
--gold:     #fbbf24;
--wood:     #f97316;
--stone:    #94a3b8;
--supply:   #a855f7;
--hp-green: #10b981;
--hp-red:   #ef4444;
--accent:   #38bdf8;
--obsidian: #090d16;
--panel-bg: rgba(9, 13, 22, 0.92);
--gold-glow: 0 0 15px rgba(251, 191, 36, 0.3);
--blue-glow: 0 0 15px rgba(56, 189, 248, 0.3);
```

The obsidian background is the ground state for the entire app — launcher, HUD panels,
modals, and the minimap container all use this palette.

## Lighting

- **HemisphereLight:** sky `0xbfdbfe` (pale blue-white), ground `0x7f6941` (warm earth),
  intensity `0.6`. Provides ambient fill that respects the biome color palette.
- **DirectionalLight:** color `0xfff5e6` (warm white), intensity `1.0`, cast shadows
  enabled (`mapSize: 2048×2048`, `shadow.bias: -0.0005`). Shadow camera covers
  `[-50, 50]` on all axes to encompass the full hex board at `MAP_RADIUS = 20`.
- Night mode darkens the directional light to near-zero and shifts the hemisphere sky
  color toward deep indigo `#1e1b4b`. The sky `background` color transitions from
  `#0f172a` (dusk) through `#030712` (night) back to `#1e3a5f` (dawn).

## Day/Night Sky Colors

| Phase | Sky Color |
|---|---|
| Day | `#7dd3fc` (sky blue, hemisphere fill) |
| Dusk / Dawn | `#0f172a` (dark navy) |
| Night | `#030712` (near black) |

Transitions are smooth over ~60 seconds of game time. The directional light rotates
around the Y axis over the cycle, changing shadow angle as the day progresses.

## Floating Text and Popup Style

Combat numbers, resource pickups, and status messages float upward from the target
world position and fade out over 1.6 seconds. Source: poc2.html `.popup-text` / 
`floatUp` keyframe. Scale-in on appear (0.6→1.3), then drift upward 280% and fade.
Colors: damage red `#ef4444`, heal green `#4ade80`, resource gold `#fbbf24`.
