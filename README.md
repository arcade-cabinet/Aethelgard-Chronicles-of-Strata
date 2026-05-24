# Aethelgard: Chronicles of Strata

<!-- M_EXPANSION.O.157 — repo state badges. CI runs on every PR;
     release tags shipped as signed APK + Pages deploy. -->
[![CI](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/actions/workflows/ci.yml/badge.svg)](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/arcade-cabinet/Aethelgard-Chronicles-of-Strata?include_prereleases&label=release)](https://github.com/arcade-cabinet/Aethelgard-Chronicles-of-Strata/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Privacy](https://img.shields.io/badge/privacy-no--network-success)](public/privacy.html)

A low-poly hex-tile real-time strategy game playable in the browser and on Android.
Build a settlement, command peons and footmen, harvest resources, and destroy the
Goblin Portal before the enemy reaches your Town Hall.

The board is generated from a seed phrase (adjective-adjective-noun) — same seed, same
map, every time, across every platform.

## Stack

| Layer | Technology |
|---|---|
| Renderer | React + react-three-fiber + drei + Three.js |
| Simulation | koota ECS |
| World gen | Dual-stage seedrandom PRNG (cyrb128 → map seed + event seed) |
| Pathfinding | yuka A* over hex axial graph |
| Audio | howler.js (sfx / music / ambient buses) |
| UI / HUD | Radix UI + framer-motion |
| Persistence | @capacitor-community/sqlite + @capacitor/preferences |
| Build | Vite + TypeScript (strict) |
| Lint / format | Biome |
| Test | Vitest (node + browser) + Playwright |
| Native | Capacitor → Android APK |
| Assets | KayKit (CC-BY) + Kenney Hexagon Kit (CC0) + Nature Kit (CC0) |

## Quick Start

```bash
pnpm install
pnpm dev          # browser dev server at http://localhost:5173
```

Assets are git-ignored and generated from the `references/` bundle:

```bash
pnpm assets:ingest   # copies GLBs + audio into public/assets/ and writes manifest.json
```

## Build Targets

| Command | Output | Use |
|---|---|---|
| `pnpm build` | `dist/` | Web — base path `/` |
| `pnpm build:pages` | `dist/` | GitHub Pages — base path `/Aethelgard-Chronicles-of-Strata/` |
| `pnpm build:native` | `dist/` + cap sync | Android — then `cd android && ./gradlew assembleDebug` |

## Verify (typecheck + lint + format + unit tests)

```bash
pnpm verify
```

## Test

```bash
pnpm test            # Vitest unit tests (Node)
pnpm test:browser    # Vitest browser tests (Chromium via Playwright)
pnpm test:e2e        # Playwright end-to-end tests
```

## Documentation

All design decisions, contracts, and acceptance criteria live in `docs/specs/`:

| File | Content |
|---|---|
| `docs/specs/00-overview.md` | Vision, scope, milestone map, glossary |
| `docs/specs/10-architecture.md` | Stack, src/ layout, ECS-as-truth boundary |
| `docs/specs/20-visual-language.md` | Palette, lighting, low-poly diorama rules |
| `docs/specs/30-asset-pipeline.md` | references/ → public/assets/ ingest, licensing |
| `docs/specs/40-hex-world.md` | Axial coords, hex math, terrain, dual-PRNG |
| `docs/specs/50-ecs-model.md` | koota components, systems, entity archetypes |
| `docs/specs/60-characters.md` | KayKit roster, animation state mapping |
| `docs/specs/70-rts-systems.md` | Economy, combat, weather, research, win/loss |
| `docs/specs/80-audio.md` | howler buses, event→sound map |
| `docs/specs/90-ui-hud.md` | HUD layout, Radix components, framer-motion |
| `docs/specs/95-persistence.md` | SQLite save schema, Preferences keys |
| `docs/specs/99-build-deploy.md` | Build targets, CI gates, milestone-TDD workflow |

Milestone contracts: `docs/milestones/M0-foundation.md` through `M6-polish.md`.

## CI

GitHub Actions runs on every PR and push to `main`:
- Typecheck, lint, format check
- Asset ingest
- Unit + browser tests (Vitest)
- Web build + Pages build
- Playwright e2e tests
- Android debug APK (Java 21, Gradle)

## License

Game code: MIT. Assets: see credits screen (KayKit CC-BY, Kenney CC0).
