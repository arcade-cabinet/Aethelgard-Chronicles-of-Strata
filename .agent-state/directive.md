# Continuous Work Directive — Aethelgard: Chronicles of Strata

**Status:** ACTIVE
**Owner:** Claude
**Cycle:** v0.13 — Decomposition + HUD design polish
**Mandate:** Per user direction 2026-05-28: the codebase has flat-file
dirs far past the cognitive-load threshold (world 97, hud 87, ecs 61,
game 57). Restructure into cohesive sub-packages with `index.ts`
barrels under `src/` (NO separate `app/` dir — rejected), following
the `~/src/arcade-cabinet/martian-trail` + koota `examples/revade`
patterns. THEN apply the HUD design-review findings once there is
structural order. Tunables stay decomposed as json+ts pairs in
`src/config/` (largely already done), grouped into domain
sub-packages with barrels.

Prior context: v0.11 merged as #89 (717ed2f). v0.12 merged as #90
(2ee7edd) on 2026-05-28 — 100+ upgrades across 6 chains, AI diplomacy
brain, persistence depth (lorebook rich-card + leaderboard
fingerprint), mobile gesture-map + haptics. All 20 CodeRabbit threads
across 7 reviewer-pass rounds addressed; 1251 unit + 224 browser
tests green at merge. release-please cuts v0.1.28 automatically.

## What CONTINUOUS means

1. **Work continuously.** Take the next [ ] item; finish it; mark
   `[x]`; commit; move to the next.
2. **Never stop for status reports.** Make progress, then summarize.
3. **Never stop for scope.** "Out of scope" is a tag in the spec.
4. **Never stop to summarize.** Each commit message IS the summary.
5. **Never stop on context pressure.** The harness auto-compacts.
6. **Never stop because a task feels big.** Decompose into
   sub-items; ship the substrate first.

Only stop on: explicit user halt, red CI on main, a true STOP_FAIL
(unrecoverable data loss / push to protected branch denied / etc.),
or a genuine design question that flips scope (ask, then continue).

## Operating loop

```
while any non-WAIT [ ] item:
  implement → verify (pnpm check + relevant tests) → commit →
  push → mark [x] → next
```

## Forbidden phrases

"deferred" | "v2+" | "out of scope" | "future work" | "tracked separately" | "follow-up"
"TODO" | "FIXME" | "stub" | "placeholder" | "mock for now"
"continue-on-error" in CI gates
"pause point" | "natural pause" | "fresh session" | "next session" | "stopping point" | "clean handoff"
"self-feedback" used as graduation signal

## Decomposition rules (from the references)

Per `docs/specs/210-package-decomposition.md`:

1. **Sub-package = cohesive feature**, not a file-count bucket.
2. **Every sub-package exports a barrel `index.ts`**; external
   imports go through the barrel, never deep paths.
3. **Co-locate `__tests__/`** inside each sub-package.
4. **Config = json (data) + ts (typed Zod accessor) pair**, grouped
   by domain, with a `schema.ts` + barrel.
5. **Preserve existing PascalCase component filenames** (rename to
   kebab-case is a separate optional pass; keep this refactor pure
   `git mv` to minimise churn + preserve history).
6. **No compat re-export of a moved module's old path** — every
   caller moves to the new barrel import in the same commit.
7. **Each commit independently green** (`pnpm check` + `pnpm test`);
   `git mv` per sub-package, one sub-package per commit.

## Workflow — long-running branch + forward review

One branch per cycle (`feat/decomp-subpackages`). Commit freely;
push regularly. After each commit, dispatch the review trio in
parallel + background; fold findings into the NEXT forward commit
(never amend a reviewed commit, never make a "fix-review" commit).
ONE PR opens when the §-blocks are shipped + reviews absorbed.
Squash-merge to main; release-please cuts the version bump.

---

## v0.13 ACTIVE QUEUE — §A Decomposition

Driven by `docs/specs/210-package-decomposition.md`. Scope this
cycle: `src/hud/`, `src/config/`, `src/world/` (the .tsx-heavy +
config dirs). `src/ecs/` + `src/game/` decompose in a later pass.

### §A1 — hud/ sub-packages (87 files → 8 packages)

Order leaf-first so later moves import the new barrel paths.

- [x] M_V13.DECOMP.HUD-THEME — `src/hud/theme/` created with
      hud-theme.ts + format.ts + barrel index.ts (HUD_THEME,
      HUD_CARD_STYLE, costLabel, formatInt, formatTime). 51
      importers rewritten (@/hud/theme + ./theme). Pure git mv,
      history preserved, no compat re-exports. 1251 tests green.
      hud-layout.ts joins this package in §B FIX-PILL-COLLISION.
- [x] M_V13.DECOMP.HUD-PRIMITIVES — folded ModalShell + HudPill +
      Segmented into the existing primitives/ package; barrel
      extended; 13 importers rewritten; theme import → ../theme.
      1251 tests green.
- [x] M_V13.DECOMP.HUD-PILLS — `src/hud/pills/` (10 status pills) +
      barrel; internal imports rewritten one level deeper; importers
      → @/hud/pills. 1251 tests green.

### §A1b — App.tsx decomposition (776 lines → screens/ + hooks)

User direction 2026-05-28: "no reason App.tsx should be so large.
That's why we need pieces like screens / components." App.tsx is
776 lines = GameSession (~350, the ~30-component HUD-mount wall +
window-event wiring) + App (~300, title/new-game/settings shell +
URL-param + dev-window hooks).

- [x] M_V13.DECOMP.APP-HUDLAYER — extracted the ~140-line HUD-mount
      wall (~30 components) into src/hud/HudLayer.tsx. App.tsx
      776→632 lines; 38 unused imports removed. GameSession keeps
      canvas + ErrorBoundary + buildContext + cameraRef. Browser
      test confirms HUD still mounts. 1251 unit green.
- [x] M_V13.DECOMP.APP-EVENTS — window-event useEffect → src/hud/
      hooks/useGameWindowEvents.ts. App.tsx 632→577. 1251 green.
- [x] M_V13.DECOMP.APP-SCREENS — REASSESSED as not-needed after the
      three prior App extractions (HUDLAYER + EVENTS + URLPARAMS).
      App.tsx is now 470 lines and its App() return is a thin
      5-component phase router (ErrorOverlay + NewGameModal +
      SettingsModal + TitleScreen + save-corrupted toast). The
      remaining body is the legitimate router responsibilities:
      resume/save-detect effects + the beginGame handler (41 lines)
      + the phase early-returns. Forcing a src/screens/ split here
      would design for a shape the code doesn't demand (meta-rule:
      build only what the step needs). Re-open only if App() grows
      a second distinct screen with its own logic. Hooks-ordering
      is correct (all hooks above the early returns — verified the
      v0.12 bug class doesn't recur).
- [x] M_V13.DECOMP.APP-URLPARAMS — window.__game* dev/test harness
      (~105 lines) → src/game/dev-harness.ts installDevHarness(g).
      App.tsx 577→470. Unused imports removed. Browser test green
      (harness path exercised). 1251 unit green.
- [x] M_V13.DECOMP.HUD-SETUP — `src/hud/setup/`: SeedField,
      MapPreview, PresetControls, OpponentPicker, FactionColorPicker,
      new-game-options.ts. Barrel. DONE: 6 git mv + index.ts barrel;
      NewGameModal + faction-color-picker harness import from setup;
      check 0, lint clean, browser test green.
- [x] M_V13.DECOMP.HUD-SELECTION — `src/hud/selection/`:
      SelectionPanel, MultiSelectActions, IdleUnitIndicator,
      BuildMenuButton, BuildQueueStrip + selection-panel-reasons
      helper + 2 css sidecars (idle-peons-indicator, th-affordance).
      Barrel. SelectionRect was DEAD (only stale comments referenced
      it; no live mount) → deleted, not moved; its data-hud-panel
      comments in App + ModalShell de-referenced. 4 browser tests +
      axe green; check 0, lint clean. NOTE: css sidecars must move
      with their component (tsc misses CSS import; browser test caught
      it) — see decomp-move-css-sidecars memory.
- [x] M_V13.DECOMP.HUD-OVERLAYS — `src/hud/overlays/`: Tutorial,
      Campaign, WaveDefense, Onboarding, LoadingScreen, TitleScreen,
      TitleBackground, ErrorOverlay, CaptionsOverlay, CriticalWarning,
      AriaLiveRegion, Toasts, TributeDemandBanner + critical-warning.css.
      Barrel. DONE: 13 git mv + css sidecar; captions + aria-live-bus
      kept at hud root (cross-cut buses imported by audio/ai/game/pills,
      not overlay-private). All importers (App, main, FixtureApp,
      HudLayer, selection/MultiSelectActions, DiscoveriesPanel + 6 tests)
      → @/hud/overlays. 19 browser tests green; check 0, lint clean.
- [x] M_V13.DECOMP.HUD-SYSTEM — `src/hud/system/`: SystemMenu,
      MobileSystemMenu, ResourceBar, Minimap, ZoneLegend, PauseControl,
      SpeedControl, SoundToggle, ResignButton, ScreenshotButton,
      KeyboardShortcuts, AchievementWatcher, PersistAchievements,
      TradeSwapWidget. Barrel. DONE: 14 git mv, no css/intra-bucket
      refs; SoundToggle's local MUTE_PREF_KEY kept private (canonical
      copy lives in @/audio/useMutedPreference). Importers (FixtureApp,
      HudLayer + 7 browser tests) → @/hud/system. 15 browser tests
      green; check 0, lint clean.
- [x] M_V13.DECOMP.HUD-MODALS — `src/hud/modals/`: NewGameModal,
      SettingsModal, GameOverModal, DiplomacyModal, DiscoveriesPanel,
      AtelierScreen, CreditsModal, HotkeyEditor, MatchSummaryCard.
      Barrel. DONE: 9 git mv (DailyChallengeLeaderboard was a planning
      over-listing — no such file; daily-challenge leaderboard is a
      feature inside NewGameModal, not a component). Intra-bucket comps
      GameOverModal→MatchSummaryCard + SettingsModal→HotkeyEditor kept
      ./-relative. Cross-bucket refs fixed: overlays/TitleScreen +
      setup/PresetControls now import @/hud/modals (../modals). All
      importers (App, FixtureApp, HudLayer + 11 browser tests) →
      @/hud/modals. 17 browser tests green; check 0, lint clean.
- [x] M_V13.DECOMP.HUD-BARREL — top `src/hud/index.ts` re-exports all
      8 sub-package barrels (theme/primitives/pills/setup/selection/
      overlays/system/modals) + HudLayer + the cross-cut helper
      modules (aria-live-bus/captions/hotkey-bindings/i18n/minimap-zoom/
      ui-store/usePinchZoom/useRafLoop). No name collisions. Internal
      HUD consumers keep GRANULAR sub-package imports (not the god-
      barrel) — tree-shaking + martian-trail/koota pattern. Consolidated
      HudLayer's 40 one-per-line imports → 5 grouped (one per bucket)
      and App's 7 → 3. gameplay-slice + zone-legend integration smoke
      green (the v0.12 hooks-regression paths); check 0, lint clean.

### §A2 — config/ domain sub-packages (22 files → 7 bundles)

- [x] M_V13.DECOMP.CONFIG-SCHEMA — extracted to src/config/schema.ts
      (resourceCostSchema + resourceIdSchema builders). economy +
      discoveries call them. Landed in commit 46f4916.
- [x] M_V13.DECOMP.CONFIG-ECONOMY — `config/economy/`: economy +
      resources json+ts. Barrel. DONE: 4 git mv into economy/; barrel
      re-exports both. economy.ts's @/config/resources → ./resources.
      LEARNING (applies to all remaining CONFIG-* bundles): config
      consumers import by bare domain path (@/config/X). When a bundle
      MERGES a non-eponymous file (resources into economy/), that file's
      external importers must repoint to the BUNDLE barrel path
      (@/config/resources → @/config/economy), else the old peer path
      404s and resource-type inference collapses repo-wide. The
      eponymous file (economy → economy/) keeps its path free via dir
      resolution. 72 tests green; check 0.
- [x] M_V13.DECOMP.CONFIG-COMBAT — `config/combat/`: combat +
      archetypes json+ts. Barrel. DONE: 4 git mv; barrel re-exports
      both. archetypes.ts's ./factions → ../factions (factions stays
      at config root → ai/ bundle later). 1 @/config/archetypes importer
      → @/config/combat. 31 combat/archetype tests green; check 0.
- [x] M_V13.DECOMP.CONFIG-PROGRESSION — `config/progression/`:
      discoveries + meta-unlocks + eras json+ts. Barrel. DONE: 5 git mv
      (eras.json is data-only — no accessor; its loader is rules/eras.ts
      via deep import @/config/progression/eras.json). discoveries +
      meta-unlocks external importers → @/config/progression. 28 tests
      green; check 0. LEARNING (extends CONFIG-ECONOMY): the repoint
      grep MUST cover THREE import forms, not just `from '…'`:
      (1) `from '@/config/X'`, (2) dynamic `await import('@/config/X')`
      [GameOverModal + persistence used this], (3) deep data import
      `from '@/config/X.json'` [rules/eras.ts used this]. Static `from`
      alone misses the latter two and tsc catches them only on full check.
- [x] M_V13.DECOMP.CONFIG-AI — `config/ai/`: ai-personalities +
      factions + faction-palette. Barrel. DONE: 4 git mv. LARGEST
      blast radius (factions imported by ~50 files across world/hud/
      game/ai/persistence). All forms repointed → @/config/ai (36
      @/config/factions + 9 ai-personalities + 5 faction-palette + 1
      ../factions from combat/archetypes). 82 config+ai tests + 3
      faction-color browser tests green; check 0.
- [x] M_V13.DECOMP.CONFIG-WORLD — `config/world/`: world + mapgen
      json+ts. Barrel. DONE: 4 git mv. Only the 15 @/config/mapgen
      importers needed repointing → @/config/world; the 48
      @/config/world importers resolved AUTOMATICALLY (world is the
      eponymous bundle file → @/config/world resolves to world/index.ts
      via dir resolution — the eponymous-file-free-path principle from
      CONFIG-ECONOMY, here saving 48 rewrites). 81 tests green; check 0.
- [x] M_V13.DECOMP.CONFIG-NARRATIVE — `config/narrative/`:
      match-narrative + myth-events + credits + campaign-chapters +
      achievements. Barrel. DONE: 7 git mv. myth-events/credits/
      campaign-chapters have .ts accessors (barrel re-exports);
      match-narrative.json + achievements.json are data-only (deep
      import @/config/narrative/X.json). All forms repointed. 30 unit
      + 3 campaign-overlay browser tests green; check 0.
- [x] M_V13.DECOMP.CONFIG-ASSETS — `config/assets/`: asset-metadata
      json+ts. Barrel. DONE: 2 git mv. Bundle dir (assets/) ≠ file name
      (asset-metadata) so ALL importers repointed → @/config/assets,
      incl. a relative ../config/asset-metadata in src/assets/assets.ts
      AND two non-source refs: the asset-manifest test's hardcoded
      json path + scripts/build-manifest.ts MANIFEST_OUT (the ingest
      writer — would've regenerated at the old path). 10 asset tests
      green; check 0. LEARNING: config moves also touch relative
      ../config/X imports + tooling/test hardcoded fs paths, not just
      @/config/X module specifiers.
- [x] M_V13.DECOMP.CONFIG-BARREL — top `config/index.ts` re-exports
      all 7 domain bundles (economy/combat/progression/ai/world/
      narrative/assets) + schema. No name collisions on check (consumers
      use granular @/config/<bundle> paths; barrel is external entry
      point). config root now: 7 bundle dirs + schema.ts + __tests__.
      §A2 COMPLETE — former flat config dir → 7 json+ts domain bundles.

### §A3 — world/ feature sub-packages (97 files)

- [x] M_V13.DECOMP.WORLD-AUDIT — enumerate world/ files into feature
      groups before moving. DONE (Explore-agent audit, 44 top-level
      files + procedural/ + __tests__). GROUPING:
      • terrain/ (10): Terrain, terrain-mesh, Roads, Crossings,
        TileInteraction, HexGridOverlay, Water, PathLine, touch-drag,
        touch-tap-threshold
      • biomes/ (4): palette, BiomeSwatch, Mountains, Decoration
        (palette stays here — BIOME_COLORS is biome-domain, NOT moved
        to config/render despite agent suggestion = scope creep)
      • board/ (19): Units, BuilderBadge, HealthBillboard, SelectionRing,
        UnitHexOutline, BuildingOutlineRing, ConstructionRing,
        FactionBase, ResourceNodes, ProjectileLayer, RallyMarker,
        StackRender, ZoneBorder, TrackingRings, barbarian-camps,
        formations, structure-models, portal-stones, resource-spawn
      • effects/ (12): ParticleEmitter, particle-consumers,
        FootstepEmitter, VolcanoLayer, WildfireLayer, DeathDropLayer,
        LootCacheLayer, ContestedPulse, CombatText, ResourceText,
        WorldBadge, world-text-font
      • procedural/ (existing) — barrel in place
      CROSS-GROUP import edges to handle: Terrain→terrain-mesh→palette
      (terrain→biomes), FactionBase→procedural (existing), and
      ResourceText/StackRender→WorldBadge (both effects, intra-group).
      Move order: biomes first (palette is the leaf dep), then terrain,
      board, effects, procedural-barrel, world-barrel.
- [x] M_V13.DECOMP.WORLD-TERRAIN — `world/terrain/`: Terrain,
      terrain-mesh, Roads, Crossings, TileInteraction, HexGridOverlay,
      Water, PathLine, touch-drag, touch-tap-threshold. Barrel. DONE:
      10 git mv. Intra-group edges (Terrain→terrain-mesh, TileInteraction
      →{HexGridOverlay,PathLine,touch-drag,touch-tap-threshold}) stay ./;
      cross-group terrain-mesh→biomes bumped to ../biomes. BuildContext
      type now @/world/terrain (HudLayer/useGameWindowEvents/SelectionPanel
      auto-repointed). 14 touch unit + 3 gameplay-slice browser green;
      check 0.
- [x] M_V13.DECOMP.WORLD-BIOMES — `world/biomes/`: palette, BiomeSwatch,
      Mountains, Decoration. Barrel. DONE: 4 git mv. terrain-mesh's
      ./palette → ./biomes; external @/world/{palette,...} → @/world/
      biomes; __tests__ relative ../palette → ../biomes/palette. 20 unit
      + 16 biome-swatch browser tests green; check 0.
- [x] M_V13.DECOMP.WORLD-BOARD — `world/board/`: 19 files (Units +
      badges/billboards, FactionBase + ConstructionRing + structure-
      models + portal-stones, ResourceNodes + resource-spawn,
      ProjectileLayer, RallyMarker, StackRender + formations, ZoneBorder,
      barbarian-camps, the ring visuals). Barrel. DONE: 19 git mv. Intra-
      board edges (Units→badges, FactionBase→ConstructionRing/structure-
      models) stay ./. FactionBase→procedural bumped to ../procedural.
      Cross-group refs to WorldBadge/world-text-font (effects, not yet
      moved) point at ../WorldBadge / @/world/world-text-font for now —
      WILL fix in WORLD-EFFECTS. 60 unit + 1 units-render browser green;
      check 0.
- [x] M_V13.DECOMP.WORLD-EFFECTS — `world/effects/`: ParticleEmitter +
      particle-consumers, FootstepEmitter, Volcano/Wildfire/DeathDrop/
      LootCache layers, ContestedPulse, CombatText, ResourceText,
      WorldBadge, world-text-font. Barrel. DONE: 12 git mv. Intra-group
      edges (particle-consumers→ParticleEmitter, ResourceText/CombatText/
      WorldBadge→world-text-font) now ./. Fixed the board→effects refs
      left dangling after WORLD-BOARD (StackRender ../WorldBadge→../effects,
      BuilderBadge @/world/world-text-font→@/world/effects). 2 particle-
      perf unit + 2 particle-emitter browser green; check 0.
      NOTE: Water lives in terrain/ (boundary feature), not effects —
      directive's parenthetical "(water, ...)" was a planning guess;
      actual grouping per WORLD-AUDIT.
- [x] M_V13.DECOMP.WORLD-PROCEDURAL — barrel the existing procedural/
      sub-tree. DONE: added top procedural/index.ts re-exporting the
      already-present nested barrels (buildings/, primitives/) + the two
      top files (faction-materials, FactionMaterialsContext). No file
      moves (sub-tree was already structured); existing deep imports
      (@/world/procedural/buildings etc.) kept working. No export
      collisions. 63 procmesh browser tests green; check 0.
- [x] M_V13.DECOMP.WORLD-BARREL — top `world/index.ts` re-exports all
      5 feature sub-packages (biomes/terrain/board/effects/procedural).
      No name collisions. world/ root now: 5 sub-packages + __tests__,
      ZERO loose files. §A3 COMPLETE — 44-file flat world dir → 5
      feature sub-packages. §A COMPLETE (hud 87→8, config flat→7,
      world 44→5). Full suite 1251 tests green.
      LEARNING: grep-gate tests that scan source files by HARDCODED fs
      path (no-hardcoded-faction-colors, color-outline-v3,
      asset-manifest) break on every move — they're not caught by tsc
      OR module-specifier greps. After a decomposition pass, grep
      tests/ + scripts/ for string-literal 'src/<dir>/<File>.tsx' fs
      paths and update them. Fixed 3 such tests this pass.

---

## §B HUD design-review findings (apply AFTER §A)

From `.ui-design/reviews/hud-directory_20260528_100148.md`. Gated on
the decomposition landing so the fixes apply to clean sub-packages.

- [x] M_V13.HUD.FIX-PILL-COLLISION — FactionChips overlapped ScoreBar
      at top-center in N-player matches. DONE: added hud/theme/
      hud-layout.ts with topCenterSlot(row) + TOP_CENTER_SLOT
      {factionChips:0, scoreBar:1}; both pills now use it (chips row 0,
      score bar row 1) so they STACK instead of collide. Kept absolute
      (the HUD wrapper is full-viewport, so absolute==fixed here; true
      `fixed` would break out of the pointer-events-none container —
      the review's "fixed" was for viewport-anchoring, which absolute-in-
      full-viewport-wrapper already gives). FactionChips zIndex now
      HUD_THEME.z.pills. Added a no-overlap regression test to the
      faction-chips harness (asserts strip.bottom <= scoreBar.top);
      eyeballed faction-chips-scorebar-stack.png — clean vertical stack,
      no overlap. 3 browser tests green; check 0. (review Major #1 +
      Minor #5)
- [x] M_V13.HUD.FOCUS-RINGS — DONE: added a global :focus-visible gold
      outline rule to styles.css covering button / [role=button] /
      [role=menuitem] / [role=tab] / .hud-interactive — keyboard focus
      only (the :focus-visible heuristic keeps mouse/touch ring-free).
      Chose a GLOBAL rule over the directive's "className sweep on every
      button" (282 inline-styled buttons + Radix-portaled modals render
      outside any single container — a global stylesheet rule is the
      correct, lower-risk fix, no per-button edit). Removed the two bare
      outline:none in MobileSystemMenu (they'd left Radix menu items with
      NO focus indicator — the actual Major #2 bug). Added focus-rings
      browser test (recurses @layer to confirm the rule loads). 2 browser
      tests green; check 0. (review Major #2)
- [x] M_V13.HUD.TOKEN-SCALE — extend HUD_THEME with `space` (4/8/12/
      16/24), `z` (board<pills<panels<banners<menu<modal<toast ladder),
      `tapTarget` (48), `safeTop/Bottom/Left/Right` helpers (non-zero
      desktop fallback). Barrel-exported. token-scale.test.ts pins all
      ramps (5 tests). DONE the token DEFINITIONS; per meta-rule, did
      NOT sweep every magic number repo-wide — adoption happens in the
      consuming items (FIX-PILL-COLLISION, TAP-TARGETS) as they touch
      those files. Audited the safe-area `0px`-fallback sites: all add a
      `+Npx` desktop margin already; SettingsModal sticky-footer's bare
      env() is intentional (footer has own padding) — NOT the Minor #6
      bug. (review Major #3 + Minor #6)
- [x] M_V13.HUD.TAP-TARGETS — DONE: added `.hud-tap-target` utility to
      styles.css (@layer base) enforcing min 48×48 inline-flex-centered;
      bumped MobileSpeedPausePill from 36×44 → 48×48 (height + both
      segment widths now HUD_THEME.tapTarget, radius tapTarget/2). Tightened
      the pill browser test to assert ALL 4 segments ≥48×48 (was ≥44×36).
      4 browser tests green; check 0. (review Major #4)
- [x] M_V13.HUD.AXE-WIDEN — DONE: extended the axe-core sweep past
      modals to add ScoreBar (pills) + CaptionsOverlay (overlays) scans
      in a new describe block. Both zero violations. axe-a11y now 6
      tests (was 4); check 0. (review Minor #7)
- [x] M_V13.HUD.CHAIN-FIELD — DONE: added a typed `chain` enum
      (DISCOVERY_CHAINS) to the discoveries.ts Zod schema +
      DiscoveryConfig + the runtime Discovery type + the registry map;
      injected `chain` into all 82 discoveries.json entries (derived
      once from the existing description prefix — all 82 mapped cleanly,
      zero misc). DiscoveriesPanel now reads `d.chain` directly;
      deleted the brittle chainForDescription string-prefix parse.
      Added a chain-coverage test (every entry has a valid chain that
      matches its description prefix). 6 config + 1 panel browser test
      green; check 0. (review Minor #8)
- [x] M_V13.HUD.LAYOUT-SPEC — DONE: wrote docs/specs/21-hud-layout.md
      capturing the coordinate model, top-center slot table (row 0
      FactionChips / row 1 ScoreBar), z-ladder, space ramp, safe-area
      helpers, 48dp tap-target floor, focus-ring rule, and axe gate —
      each cross-referencing the token/helper + the test that pins it.
      This is the contract future HUD commits check against. §B COMPLETE.
      (review Suggestion #3)

---

## §C Release ladder

- [ ] [WAIT-USER] M_V13.RELEASE.PR — open ONE PR feat/decomp-
      subpackages → main when §A + §B land + reviews absorbed.
- [ ] [WAIT-CI] M_V13.RELEASE.CI-WATCH — 8/8 checks + CodeRabbit
      sweep.
- [ ] [WAIT-USER] M_V13.RELEASE.SQUASH — squash-merge on user
      authorization; release-please cuts the version bump.

---

## Recurring main-thread hygiene

- [ ] [WAIT] M_MAIN.RELEASE-LADDER — watch release-please PRs
      (v0.1.27 from #89, v0.1.28 from #90). Merge when CI lands.
- [x] M_MAIN.DIRECTIVE-EDIT — this overhaul (first commit of the
      decomp PR per user direction). Recurring; carries forward,
      maintained per-commit not in batches.
- [ ] [WAIT-PR] M_MAIN.CODERABBIT-SWEEP — sweep CodeRabbit threads on
      open PRs as they post. Zero open PRs right now (the v0.13 PR
      opens only on user authorization, gated below). Re-arms when a
      PR exists with a CodeRabbit review.
- [x] M_MAIN.WORKTREE-CLEANUP — pruned post-#90 merge (only main
      worktree remains); dropped the agent-state stash.
- [ ] [WAIT-FLAKE] M_MAIN.GRINDER-WATCH — convert any flake to a
      deterministic fix, never a retry. Most recent: SuspenseProbe
      stall (43s asset suspend on cold Vite cache) in save-load-n-player
      e2e — environmental, not a code defect. Patched the pre-push hook
      to retry e2e once (commit fcb23e9, mirrors test:browser pattern);
      a true deterministic fix needs asset preloading or a longer
      waitForFunction timeout — queued for a v0.14 perf pass when the
      ECS/game decomp brings the harness under closer instrumentation.
      Re-arms on the next observed flake.

---

## §post-horizon — v0.14+

- [ ] [WAIT-CYCLE] M_V14.DECOMP-ECS-GAME — decompose src/ecs/ (61) +
      src/game/ (57) into sub-packages once the hud/config/world
      precedent is set + reviewed.
- [ ] [WAIT-CYCLE] M_V14.KEBAB-RENAME — optional pass renaming
      PascalCase component files to kebab-case per the koota/revade
      convention (deferred to keep the decomposition pure git mv).
- [ ] [WAIT-DEVICE] M_V14.MOBILE-DEVICE-AUDIT — the M_V12.MOBILE
      tap-audit / safe-area / orientation / offline items that need
      a real Pixel 5a / iPhone 14.
- [ ] [WAIT-DESIGN] M_V14.PERSIST-CLOUD — cloud-sync opt-in +
      Chronicle saga page (v0.12 §4 deferrals).
- [ ] [WAIT-CYCLE] M_V14.NAMED-HEROES-RUNTIME — differentiate the 5
      Atelier hero-* unlocks (unique passive / active / death dialog).

---

## Reference — historical cycles

- v0.4 → v0.10 PRDs at `docs/specs/PRD-v0.{4..10}.md`.
- v0.11 spec discoveries: `docs/specs/200-genre-commitment.md`,
  `201-stacking-and-formations.md`.
- v0.12: `docs/specs/PRD-v0.12.md`, `202-mobile-gestures.md`,
  `docs/design/v0.12-upgrade-graph.md`. Merged as #90 (2ee7edd).
- v0.13 decomposition: `docs/specs/210-package-decomposition.md`.
- HUD design review: `.ui-design/reviews/hud-directory_20260528_100148.md`.
