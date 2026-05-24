---
title: Contributing
updated: 2026-05-24
status: current
domain: ops
---

# Contributing to Aethelgard: Chronicles of Strata

## Local development

```bash
pnpm install
pnpm dev # http://127.0.0.1:5173
```

## Test stack

```bash
pnpm verify          # tsc + biome + tests (pre-commit)
pnpm check           # tsc --noEmit
pnpm lint            # biome lint (primary)
pnpm lint:eslint     # second-pass react-hooks (M_FUN.FOUNDATION.ESLINT)
pnpm lint:md         # markdownlint (M_FUN.FOUNDATION.MDLINT)
pnpm test            # vitest unit
pnpm test:browser    # vitest browser (real Chromium)
pnpm test:e2e        # Playwright tier-1
JOURNEY=1 pnpm exec playwright test tests/e2e/ai-vs-ai-balance.spec.ts  # AIVAI balance harness
```

## Running CI workflows locally with `act`

`act` runs GitHub Actions workflows in Docker so you can debug a
CI failure without pushing.

```bash
brew install act              # macOS
# OR: https://nektosact.com/installation/
act -j unit-and-e2e           # match the job name in .github/workflows/ci.yml
act -j unit-and-e2e -P ubuntu-latest=catthehacker/ubuntu:full-22.04
                              # full-tagged image carries the Playwright deps
```

`act` reads `.actrc` if present; we don't ship one (the defaults work).
For workflows that need GITHUB_TOKEN, pass `-s GITHUB_TOKEN=<personal-token>`.

## Commit format

[Conventional Commits](https://www.conventionalcommits.org/):
`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`,
`ci:`, `build:`. PRs are squash-merged.

Every commit ends with:

```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## PRs

Open as a Draft until CI is green. Address every reviewer block;
never `--admin` merge.

## Asset licensing

Bundled assets are CC0 (Kenney) or CC-BY (KayKit) — attribution lives
in `src/config/credits.json` and is shown in-game from the
CreditsModal. See `STANDARDS.md` for the full policy.
