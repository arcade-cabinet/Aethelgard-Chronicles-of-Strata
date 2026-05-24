---
title: Contributors
updated: 2026-05-23
status: current
domain: product
---

# Contributing to Aethelgard

This is a hex-tile RTS built with React + react-three-fiber + koota
ECS + Capacitor, shipped to web (GitHub Pages) and Android.

## First-time setup

```sh
# 1. Clone + install
git clone git@github.com:arcade-cabinet/Aethelgard-Chronicles-of-Strata.git
cd Aethelgard-Chronicles-of-Strata
pnpm install   # pnpm 9.15.0 (corepack handles it)

# 2. Run the dev server (web)
pnpm dev       # http://localhost:5173

# 3. Run the full verify pass (matches CI)
pnpm verify    # tsc + lint + format + test

# 4. Browser tests (real Chromium via vitest)
pnpm test:browser

# 5. Android (needs Java 21 + Android SDK)
pnpm build:native
pnpm cap:run:android
```

## The dev loop

1. **Read the spec first.** `docs/specs/` has one file per system.
   Drift from spec = bug in code, not the other way around (unless
   you also revise the spec).
2. **Write the failing test.** `tests/unit/` for pure logic;
   `tests/browser/` for DOM/canvas/Web Audio.
3. **Make it green.** No `as any`, no `@ts-ignore`, no `.skip()`,
   no `TODO:` markers — fix or delete.
4. **Commit.** Conventional Commits; one commit per logical change.
5. **Push.** CI runs lint + type + tests + browser tests + APK build.

## Repo layout

```
src/core/        hex math, dual-PRNG, A* graph — pure, no THREE/React
src/ecs/         koota world: components/, systems/
src/world/       terrain, board r3f components
src/entities/    character/building r3f components, rig loader
src/render/      Canvas, lighting, day-night, camera
src/audio/       howler buses, event→sound map
src/hud/         Radix + framer-motion HUD
src/game/        game state machine, save/load, AI
docs/specs/      pillar docs (source of truth)
```

## Determinism contract

Every PRNG call goes through `src/core/rng`. `Math.random()` is
banned in `src/core/**`, `src/ecs/**`, `src/world/**`, `src/game/**`.
`performance.now()` is banned in the same scope; use the engine
clock facade.

## Conventional commit prefixes

- `feat:` — new behaviour visible to the player
- `fix:` — bug fix
- `chore:` — non-behaviour change (deps, build)
- `docs:` — docs only
- `refactor:` — code change without behaviour change
- `perf:` — perf improvement
- `test:` — test only
- `ci:` — CI workflow change
- `build:` — build system change

## Where to start

- Open `.agent-state/directive.md` and pick an unchecked `[ ]`
  item. WAIT-prefixed items are blocked on something external.
- Read the spec doc referenced by the item.
- Land a focused commit per item; push.

## Code quality gates

`<repo>/.claude/gates.json` enforces:

- Banned patterns: `Math.random()` / `performance.now()` outside
  facade
- Banned bash flags: `--no-verify`, `git push --force` (use `--
  force-with-lease`)
- Scope-vs-tests rules: changes to `src/render/**` must include
  `tests/visual/**` updates (or `// no-visual-impact: <reason>`)

## Where to ask

Issues: https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/issues
