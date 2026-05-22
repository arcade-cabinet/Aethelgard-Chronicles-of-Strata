# Changelog

All notable changes to Aethelgard: Chronicles of Strata will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] — Initial Release

The first playable release — a low-poly hex-tile tap-to-command RTS, shipped to
web (GitHub Pages) and debug Android (Capacitor) from one PR. Built across seven
milestones (M0–M6).

### Foundation & board (M0–M1)

- pnpm + Vite + TypeScript (strict) scaffold; React + react-three-fiber render
  shell; koota ECS; Biome lint/format; Vitest (node + browser) and Playwright.
- Capacitor Android config; GitHub Actions CI (build/test + debug-APK) and a
  GitHub Pages deploy workflow.
- Asset ingest pipeline curating `references/` → `public/assets/`, with
  GLB textures embedded and audio (OGG/WAV) bundled.
- Deterministic hex board — axial coordinates, FBM-noise terrain, eight biomes,
  elevation tiers, ramps, and A* pathfinding with ramp-gated traversal.

### Characters & economy (M2–M3)

- KayKit shared-rig character system — heroes and enemies retargeted onto the
  shared Rig_Medium / Rig_Large animation libraries via drei `useAnimations`.
- The autonomous Warcraft-style economy — peons harvest wood/stone/gold, carry,
  and deposit; resource nodes; the Town Hall; build mode; supply.

### Combat & systems (M4–M5)

- The combat loop — footmen vs goblins/orcs, the Goblin Portal spawn timer,
  enemy AI with retargeting, event-PRNG damage rolls, health billboards,
  floating combat text, win/loss conditions.
- Production systems — seeded weather (sunny/fog/rain) with a rain movement
  penalty, research upgrades, barracks rally points, a 2D minimap, a day/night
  cycle, and timed Orc escalation.

### Polish & ship (M6)

- Branded title screen — New Game / Continue / Settings, with a New Game modal
  for seed phrase, map size, and AI difficulty.
- Radix + framer-motion HUD — themed resource bar, selection panel with
  build/research controls, accessible win/loss dialog.
- Howler audio wired to combat, win/loss, and the gameplay music loop.
- SQLite save/load + Capacitor Preferences settings; a 5-minute auto-save.
- poc1-quality terrain — one merged terrain mesh, real cone mountains, wooden
  ramps, layered water, distance fog, soft shadows.
- Viewport architecture — desktop / phone-landscape / phone-portrait classes;
  a camera with zoom, pan, and map slicing; a viewport-adaptive HUD.

### Architecture

- Two-PRNG model — a map PRNG seeded by the player's phrase, and a separate
  event PRNG (a buried Capacitor Preferences seed) for combat/weather; the
  seed-phrase shuffle is itself an event draw, so the deterministic core has no
  `Math.random`.
- All tuning lives in `src/config/{combat,economy,world}.json`, loaded through
  typed config modules — there is no `core/constants`.

### Known follow-up

- M7 — the AI is to be promoted to a yuka-backed `src/ai/` subpackage.

## [Unreleased]
