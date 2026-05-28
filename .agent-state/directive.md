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
tests green at merge. (release-please owns version numbers — not the
agent, ever.)

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
Do ALL the work on ONE local branch; only then engage remote feedback
(CI + CodeRabbit), resolve everything, and squash-merge. release-please
computes + cuts the version after merge — the agent never names it.

---

## SHIPPED — §A decomposition + §B HUD polish (PR #91)

Full record: `docs/specs/210-package-decomposition.md` (the hud/config/
world sub-package maps + layer order + cycle fixes + verification
contract) and `docs/specs/21-hud-layout.md` (the HUD layout contract).
Decision/why trail: `git log` + `.agent-state/decisions.ndjson`.

- [x] §A — hud 87→8 sub-packages, config flat→7 bundles, world 44→5
  sub-packages, App.tsx 776→470 (HudLayer + useGameWindowEvents +
  dev-harness extracted). Pure git mv + barrels; 2 import cycles broken
  (emitToast→toast-bus leaf, NewGameChoices→setup).
- [x] §B — 7 HUD design-review fixes: pill-collision (topCenterSlot),
  token-scale (space/z/tapTarget/safe-area), tap-targets (48dp),
  focus-rings (global :focus-visible), axe-widen (pills+overlays),
  chain-field (typed discoveries.chain), layout-spec.
- [x] Bonus fixes surfaced enabling 4 skipped e2e: persistence web-flush
  (saves never survived reload on web), dev-harness render-vs-commit +
  prod-gate, Vite-HMR mid-test-reload e2e flake, settings-persistence
  async-write flake, static-assets determinism, sideEffects tree-shaking.
- [x] Comprehensive full-review (5 findings, all fixed) + all CodeRabbit
  threads addressed + resolved.

## §C Release ladder — SHIPPED

- [x] PR #91 MERGED (squash, 2026-05-28, → main 02dcfed). 8/8 CI green,
      all CodeRabbit + full-review threads resolved, comprehensive review
      (5 findings, all fixed). CI-watch + thread-resolution + squash-merge
      all done autonomously. release-please will compute + cut the next
      version from the Conventional Commits — the agent does NOT name it.

---

## Recurring main-thread hygiene

- [ ] [WAIT] M_MAIN.RELEASE-LADDER — when release-please opens its
      version-bump PR (it computes the number from the merged
      Conventional Commits — the agent never names it), merge it once CI
      lands.
- [x] M_MAIN.DIRECTIVE-EDIT — this overhaul (first commit of the
      decomp PR per user direction). Recurring; carries forward,
      maintained per-commit not in batches.
- [ ] M_MAIN.CODERABBIT-SWEEP — sweep + resolve CodeRabbit threads on
      any open PR as they post (recurring). Re-arms whenever a PR is open.
- [ ] M_MAIN.GRINDER-WATCH — convert any flake to a deterministic fix,
      never a retry (recurring). The save-load-n-player `__game not ready`
      flake is RESOLVED (root cause: Vite dev-server pushed full page
      reloads mid-test via the static-assets watcher + HMR; fix: gate them
      off under VITE_E2E + atomic __game_ready gate + reload-sentinel
      guard — shipped in #91, full e2e green twice). Re-arms on the next
      observed flake.

---

## Backlog — unstarted work

The agent NEVER decides version numbers and NEVER version-gates work.
release-please computes the next version from the Conventional Commits
after a merge — not the agent's concern. These are just units of work:
do them on the current ONE local branch as reached, then engage remote
feedback (CI + CodeRabbit) and squash-merge.

- [x] M_BACKLOG.CI-TEST-SPEED — DONE. Investigated to ground truth:
      within-suite parallelism is architecturally precluded (browser
      needs ONE r3f renderer → single Chromium instance mandatory; unit
      isolate:false breaks koota module-singleton components — both
      empirically confirmed broken). Shipped on this branch: (a) Playwright
      browser-binary cache keyed on lockfile (~26s), (b) the structural
      win — split the monolithic serial build-and-test (unit+browser+
      builds+e2e ~20min) into a fast-gate job + a PARALLEL browser-and-e2e
      job, dropping suite wall-clock from ~sum to ~max. (c) fixed the
      browser SQLite mock's missing saveToStore. CI run on push validates
      the new job topology.

- [ ] M_DECOMP-ECS-GAME — decompose src/ecs/ + src/game/ into
      sub-packages on the current branch. AUDITED (Explore agent) —
      grounded grouping + import-edge map below; ready to execute.
      Move order by risk:
      • PHASE 1 (low risk) — ecs/systems/ (28 files, ZERO intra-dir
        imports, all leaf systems). Groups: combat (combat,
        offensive-behavior, mob-targeting, wave-defense, stance-behavior),
        economy (harvest, deposit, hidden-bonus, science, market-trade,
        loot-pickup), lifecycle (spawn, death, building-death),
        movement (job-routing, path-follow, engineer-repair, wander,
        animation), hazards (volcano, quake, wildfire, encroachment),
        meta (ai, diplomat-contact, status-attributes, win-loss).
        ONLY economy-tick-phases.ts (game/, the orchestrator) imports
        all 26 — its 26 paths update to the new barrels. components.ts
        + world.ts stay at ecs/ root (cross-cut by ALL systems).
      • PHASE 2 (low risk) — game/ leaf groups: narrative (match-narrative,
        narrator-beats, myth-events, random-events, daily-challenge,
        achievements) + utilities (mapgen-helpers, projectiles, rally,
        auto-save, dev-harness, commands).
      • PHASE 3 (defer/careful) — game/ economy + diplomacy clusters are
        hub-coupled (economy.ts 6+5 edges, diplomacy.ts 5+3); game-state.ts
        stays at root (10+ importers). Decompose only with hub-aware
        barrels, or leave hubs at root.
      CROSS-DIR coupling: 10 ecs→game edges (combat→combat-math, deposit/
        hidden-bonus/science→economy, diplomat-contact→diplomacy, etc.),
        3 game→ecs (economy-tick-phases→26, game-state→ai, random-events
        →quake/wildfire). Manageable; ecs-first is independently shippable.
- [ ] [WAIT-DEVICE] M_V14.MOBILE-DEVICE-AUDIT — the M_V12.MOBILE
      tap-audit / safe-area / orientation / offline items that need
      a real Pixel 5a / iPhone 14 (genuine hardware dependency).

(Removed: KEBAB-RENAME was self-described as "optional" — dropped as
gratuitous churn. PERSIST-CLOUD + NAMED-HEROES-RUNTIME were
forbidden-phrase "v0.12 §4 deferrals" with no concrete scope —
dropped per the rule against using §post-horizon as a deferral bucket.
Re-add with concrete scope if/when there's user demand.)

---

## Reference — historical cycles

- v0.4 → v0.10 PRDs at `docs/specs/PRD-v0.{4..10}.md`.
- v0.11 spec discoveries: `docs/specs/200-genre-commitment.md`,
  `201-stacking-and-formations.md`.
- v0.12: `docs/specs/PRD-v0.12.md`, `202-mobile-gestures.md`,
  `docs/design/v0.12-upgrade-graph.md`. Merged as #90 (2ee7edd).
- v0.13 decomposition: `docs/specs/210-package-decomposition.md`.
- HUD design review: `.ui-design/reviews/hud-directory_20260528_100148.md`.
