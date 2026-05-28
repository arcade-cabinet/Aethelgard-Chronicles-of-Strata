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
- [ ] M_V13.DECOMP.APP-EVENTS — extract GameSession's window-event
      wiring useEffect (trigger-build / open-build-menu /
      focus-palace) into a `useGameWindowEvents(game)` hook in
      `src/hud/hooks/`.
- [ ] M_V13.DECOMP.APP-SCREENS — extract the App-level phase shell
      (title / new-game / settings / resumed / config) into
      `src/screens/` components so App.tsx is a thin router. Verify
      no hooks-ordering regression (the v0.12 bug class) — all hooks
      stay above the early returns.
- [ ] M_V13.DECOMP.APP-URLPARAMS — move the ?nplayer / ?seed / ?mode
      URL-param parsing + dev-window (__game) hooks into
      `src/game/dev-harness.ts` (already partly headless).
- [ ] M_V13.DECOMP.HUD-SETUP — `src/hud/setup/`: SeedField,
      MapPreview, PresetControls, OpponentPicker, FactionColorPicker,
      new-game-options.ts. Barrel.
- [ ] M_V13.DECOMP.HUD-SELECTION — `src/hud/selection/`:
      SelectionPanel, SelectionRect, MultiSelectActions,
      IdleUnitIndicator, BuildMenuButton, BuildQueueStrip. Barrel.
- [ ] M_V13.DECOMP.HUD-OVERLAYS — `src/hud/overlays/`: Tutorial,
      Campaign, WaveDefense, Onboarding, LoadingScreen, TitleScreen,
      TitleBackground, ErrorOverlay, CaptionsOverlay, CriticalWarning,
      AriaLiveRegion, Toasts, TributeDemandBanner. Barrel.
- [ ] M_V13.DECOMP.HUD-SYSTEM — `src/hud/system/`: SystemMenu,
      MobileSystemMenu, ResourceBar, Minimap, ZoneLegend, Pause,
      Speed, SoundToggle, Resign, Screenshot, KeyboardShortcuts,
      AchievementWatcher, PersistAchievements, TradeSwapWidget. Barrel.
- [ ] M_V13.DECOMP.HUD-MODALS — `src/hud/modals/`: NewGameModal,
      SettingsModal, GameOverModal, DiplomacyModal, DiscoveriesPanel,
      AtelierScreen, CreditsModal, HotkeyEditor, MatchSummaryCard,
      DailyChallengeLeaderboard. Barrel.
- [ ] M_V13.DECOMP.HUD-BARREL — top `src/hud/index.ts` re-exporting
      every sub-package barrel; update App.tsx to import from barrels.

### §A2 — config/ domain sub-packages (22 files → 7 bundles)

- [ ] M_V13.DECOMP.CONFIG-SCHEMA — extract shared Zod helpers to
      `src/config/schema.ts` (ResourceCost etc.).
- [ ] M_V13.DECOMP.CONFIG-ECONOMY — `config/economy/`: economy +
      resources json+ts. Barrel.
- [ ] M_V13.DECOMP.CONFIG-COMBAT — `config/combat/`: combat +
      archetypes json+ts. Barrel.
- [ ] M_V13.DECOMP.CONFIG-PROGRESSION — `config/progression/`:
      discoveries + meta-unlocks + eras json+ts. Barrel.
- [ ] M_V13.DECOMP.CONFIG-AI — `config/ai/`: ai-personalities +
      factions + faction-palette. Barrel.
- [ ] M_V13.DECOMP.CONFIG-WORLD — `config/world/`: world + mapgen
      json+ts. Barrel.
- [ ] M_V13.DECOMP.CONFIG-NARRATIVE — `config/narrative/`:
      match-narrative + myth-events + credits + campaign-chapters +
      achievements. Barrel.
- [ ] M_V13.DECOMP.CONFIG-ASSETS — `config/assets/`: asset-metadata
      json+ts. Barrel.
- [ ] M_V13.DECOMP.CONFIG-BARREL — top `config/index.ts`.

### §A3 — world/ feature sub-packages (97 files)

- [ ] M_V13.DECOMP.WORLD-AUDIT — enumerate world/ files into feature
      groups (terrain / biomes / board / effects / procedural /
      characters) before moving. Some sub-trees (procedural/) already
      exist; barrel them in place.
- [ ] M_V13.DECOMP.WORLD-TERRAIN — `world/terrain/`. Barrel.
- [ ] M_V13.DECOMP.WORLD-BIOMES — `world/biomes/`. Barrel.
- [ ] M_V13.DECOMP.WORLD-BOARD — `world/board/`. Barrel.
- [ ] M_V13.DECOMP.WORLD-EFFECTS — `world/effects/` (water, particles,
      weather-visual, volcano, wildfire). Barrel.
- [ ] M_V13.DECOMP.WORLD-PROCEDURAL — barrel the existing
      procedural/ sub-tree.
- [ ] M_V13.DECOMP.WORLD-BARREL — top `world/index.ts`.

---

## §B HUD design-review findings (apply AFTER §A)

From `.ui-design/reviews/hud-directory_20260528_100148.md`. Gated on
the decomposition landing so the fixes apply to clean sub-packages.

- [ ] M_V13.HUD.FIX-PILL-COLLISION — FactionChips overlaps ScoreBar
      at top-center in N-player matches. Stagger via a shared
      `hud/theme/hud-layout.ts` TOP_CENTER_SLOT helper; make ScoreBar
      `position: fixed`. (review Major #1 + Minor #5)
- [ ] M_V13.HUD.FOCUS-RINGS — global `.hud-interactive` +
      `:focus-visible` rule in app stylesheet; className sweep on
      every button; remove the bare `outline:none` in
      MobileSystemMenu. (review Major #2)
- [ ] M_V13.HUD.TOKEN-SCALE — extend HUD_THEME with `space` (4/8/12/
      16/24), `z` (named ladder), `safeTop`/`safeBottom` helpers;
      collapse the scattered padding + z-index + safe-area magic
      numbers. (review Major #3 + Minor #6)
- [ ] M_V13.HUD.TAP-TARGETS — enforce 48dp via a shared
      `.hud-tap-target` floor; bump MobileSpeedPausePill 36→48.
      (review Major #4)
- [ ] M_V13.HUD.AXE-WIDEN — extend the axe-core sweep past modals to
      pills + overlays. (review Minor #7)
- [ ] M_V13.HUD.CHAIN-FIELD — add a typed `chain` field to
      discoveries.json schema; drop DiscoveriesPanel's
      description-prefix parse. (review Minor #8)
- [ ] M_V13.HUD.LAYOUT-SPEC — write `docs/specs/21-hud-layout.md`
      capturing the top-center slot order + z-ladder + safe-area
      helper as the contract future HUD commits check against.
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
- [ ] M_MAIN.CODERABBIT-SWEEP — sweep CodeRabbit threads on open PRs
      daily; resolve as addressed.
- [x] M_MAIN.WORKTREE-CLEANUP — pruned post-#90 merge (only main
      worktree remains); dropped the agent-state stash.
- [ ] M_MAIN.GRINDER-WATCH — convert any flake to a deterministic
      fix, never a retry.

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
