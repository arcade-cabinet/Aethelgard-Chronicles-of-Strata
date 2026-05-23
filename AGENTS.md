# AGENTS.md — Aethelgard Operating Protocol

Extended operating protocol for autonomous agents working on this codebase.
Inherits all rules from `CLAUDE.md` (repo root) and the global `~/.claude/CLAUDE.md`.
This file adds Aethelgard-specific constraints.

## Doctrine: Docs → Tests → Code

Every new system, component, or mechanic follows this sequence:

1. Update the relevant `docs/specs/NN-*.md` with the contract.
2. Write failing tests that derive assertions from the spec (not the implementation).
3. Implement until tests are green.
4. Self-assess: does the visual/behavioral output match the spec? If not, fix before commit.

Spec drift is a bug. Code and pillar doc disagreeing means one is wrong — fix both in
the same commit. Never let an implementation diverge silently from its spec.

## ECS as Single Source of Truth

The koota ECS world is the game state. The renderer reads from it — it does not own
state. Systems mutate components; r3f components observe them. This boundary is absolute:
no game logic in React components, no component state for game entities.

Rule: if you find yourself thinking "I'll store this in useState", that state belongs
in a koota component instead.

## Milestone-TDD Workflow

At each milestone boundary (`docs/milestones/MN-*.md`):

1. Write the milestone spec doc first — every contract listed, each citing the pillar
   doc section it derives from and naming the test file that will pin it.
2. Write ALL failing tests in a single batch of test-only commits. Run `pnpm verify`
   after — the failures list is the complete remaining work queue.
3. Make failures green one at a time, in dependency order. Each implementation commit
   turns one or a few related RED tests GREEN.
4. When every milestone test is green, the milestone is done by construction.

This replaces "what else?" gap analysis — the failure list was the work queue.

## Visual Ownership

The agent is responsible for visual correctness, not the user.

Before every commit touching `src/render/**`, `src/hud/**`, `src/world/**`,
or `src/entities/**`:

1. Run the dev server or build.
2. Screenshot the output (chrome-devtools-mcp or Playwright).
3. Read the screenshot.
4. Compare against `docs/specs/20-visual-language.md` (palette, flat-shading, implied grid).
5. If it looks wrong — fix it before committing.

Shipping a visual bug with a "self-feedback: needs polish" note is shipping a bug.
Self-feedback is the trigger to keep working, not a graduation signal.

## Asset Pipeline

`references/` is git-ignored. CI regenerates `public/assets/` via `pnpm assets:ingest`
before every build and test run. Never commit files from `public/assets/` or `references/`.

When adding assets to `scripts/asset-map.ts`, the source path must match the real
`references/` tree exactly. Run `pnpm assets:ingest` locally to verify before commit.

## RNG Discipline

Simulation code (`src/core/`, `src/ecs/`, `src/world/`, `src/game/`) must never call
`Math.random()` directly. Use the seedrandom RNG facade in `src/core/rng`. The
`.claude/gates.json` ban_patterns rule enforces this — violations block commits.

Determinism test: same seed phrase → identical board + identical event sequence on
every platform and every run. If this breaks, the release ships nothing.

## Code Quality Gates

`.claude/gates.json` enforces:
- Render/UI/world changes require visual or browser test updates (or explicit skip justification).
- Core/ECS/game changes require unit or browser test updates.
- `Math.random()` banned in simulation code.
- `as any` banned everywhere in `src/`.
- `--no-verify`, `npm install`, `yarn`, `package-lock.json` banned in bash.
- Max 600 lines per file (warning).

## Commit Convention

Conventional Commits always: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`,
`perf:`, `test:`, `ci:`, `build:`. Scope optional: `feat(ecs):`, `fix(render):`.

Co-authorship trailer on every commit:
`Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

One commit per issue inside a long-running topic branch. Never amend a reviewed commit.
