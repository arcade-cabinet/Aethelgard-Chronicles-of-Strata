# Package Decomposition (v0.13)

Source-of-record for the v0.13 sub-package decomposition. The directive
(`.agent-state/directive.md`) drives execution and cites this doc; this
doc records the final structure + the rationale + the explicit deferrals.

## Principle

Decompose by **responsibility**, not line count. Each feature sub-package
is a directory with an `index.ts` barrel. Internal consumers import the
**granular** `@/<area>/<feature>` path (keeps tree-shaking tight); the
top-level `@/<area>` barrel is the external discoverability entry point.
Moves are **pure `git mv`** — every importer is rewritten in the same
commit, no compat re-exports beyond the barrels themselves.

Layer order within a package is enforced (no cycles — verified by
`madge --circular`): lower layers never import up into higher ones.

## src/hud/ — 87-file flat dir → 8 feature sub-packages

| sub-package | owns |
|---|---|
| `theme/` | design tokens (HUD_THEME: color/space/z/tapTarget, safe-area helpers), formatters, `hud-layout.ts` (topCenterSlot) |
| `primitives/` | shared building blocks: ModalShell, HudPill, Segmented, SectionCard, … |
| `pills/` | top-bar status pills: ScoreBar, FactionChips, WinConditionPill, … |
| `setup/` | new-game config surface: SeedField, MapPreview, OpponentPicker, FactionColorPicker, PresetControls, new-game-options (incl. `NewGameChoices` type) |
| `selection/` | selection + build-command: SelectionPanel, MultiSelectActions, IdleUnitIndicator, BuildMenuButton, BuildQueueStrip |
| `overlays/` | full-bleed surfaces: Tutorial/Campaign/WaveDefense/Onboarding, LoadingScreen, TitleScreen, ErrorOverlay, Captions, CriticalWarning, AriaLiveRegion, Toasts, TributeDemandBanner |
| `system/` | persistent control + status chrome: SystemMenu, ResourceBar, Minimap, ZoneLegend, Pause/Speed/Sound/Resign/Screenshot, KeyboardShortcuts, AchievementWatcher, TradeSwapWidget |
| `modals/` | dialog + panel surfaces: NewGameModal, SettingsModal, GameOverModal, DiplomacyModal, DiscoveriesPanel, AtelierScreen, CreditsModal, HotkeyEditor, MatchSummaryCard |

Plus `HudLayer.tsx` (the mount-wall composer) + cross-cutting LEAF
helpers at hud root: `toast-bus.ts`, `aria-live-bus.ts`, `captions.ts`,
`hotkey-bindings.ts`, `i18n.ts`, `ui-store.ts`, `useRafLoop.ts`,
`usePinchZoom.ts`, `minimap-zoom.ts`, `desktop-keyboard.tsx`. These are
infra (buses/stores/hooks) imported by many layers — they stay leaves,
NOT in a feature bucket, so they never create up-cycles.

**Layer order:** theme < primitives < {pills, setup, selection} <
overlays < modals < HudLayer. Two cycles found in review + fixed by
relocating mislocated symbols DOWN: `emitToast`/`ToastSpec` → `toast-bus`
leaf (was in overlays), `NewGameChoices` → `setup` (was in modals).

App.tsx decomposed 776 → ~470 lines: extracted `HudLayer`,
`useGameWindowEvents` (hooks/), `installDevHarness` (src/game/dev-harness.ts).

## src/config/ — flat → 7 domain bundles + shared schema

`economy/` (resources + economy tuning), `combat/` (combat + archetypes),
`progression/` (discoveries + meta-unlocks + eras), `ai/` (factions +
faction-palette + ai-personalities), `world/` (world geometry/camera +
mapgen), `narrative/` (myth-events + credits + campaign-chapters +
match-narrative + achievements), `assets/` (asset-metadata). Each bundle
is json+ts(+barrel). Shared Zod builders in `config/schema.ts`
(`resourceCostSchema`, `resourceIdSchema`). Bare data files
(match-narrative.json, achievements.json, eras.json) are deep-imported by
their loaders — barrels cover the symbol surface, not raw JSON assets.

Consumers import by bare domain path (`@/config/<bundle>`); a bundle that
MERGES a non-eponymous file (e.g. resources into economy/) repoints that
file's importers to the bundle barrel.

## src/world/ — 44-file flat dir → 5 feature sub-packages

`biomes/` (palette, BiomeSwatch, Mountains, Decoration), `terrain/`
(Terrain + mesh, Roads, Crossings, TileInteraction, HexGridOverlay, Water,
PathLine, touch-drag/tap), `board/` (Units + badges, FactionBase +
ConstructionRing + structure-models + portal-stones, ResourceNodes +
resource-spawn, ProjectileLayer, RallyMarker, StackRender + formations,
ZoneBorder, barbarian-camps, ring visuals), `effects/` (ParticleEmitter +
consumers, Footstep, Volcano/Wildfire/DeathDrop/LootCache layers,
ContestedPulse, CombatText, ResourceText, WorldBadge, world-text-font),
`procedural/` (existing buildings/ + primitives/ + faction-materials —
barrelled in place). `components.ts` + `world.ts` stay at ecs/world roots
(cross-cut by all). Move order was dependency-driven: biomes (palette is
the leaf dep) → terrain → board → effects → procedural-barrel → barrel.

## Deferred to v0.14 (explicit)

- **src/ecs/ (61 files) + src/game/ (57 files)** — decomposition AUDITED
  (grouping + import-edge map in the directive's M_V14.DECOMP-ECS-GAME
  item) but NOT executed this cycle. Gated `[WAIT-PR]` behind the v0.13
  PR merging (one-topic-per-PR). ecs/systems is the safe phase-1 slice
  (zero intra-dir imports). Honored: no src/ecs or src/game sub-dir split
  shipped in v0.13.
- **kebab-case file rename** — dropped (self-described optional churn;
  the decomposition stayed pure `git mv` to preserve history).

## Verification contract

Each move: `pnpm check` 0 errors + `pnpm lint` clean + the moved
component's `pnpm test:browser` green (tsc does NOT catch CSS-sidecar or
fs-path-literal breakage — only the browser/e2e layer does; see the
`decomp-hidden-breakages` learning). `madge --circular src/hud` clean.
Full suite (1257 unit + 228 browser + e2e) green before merge.
