<!-- profile: arcade-game v1 -->

# Aethelgard: Chronicles of Strata

Low-poly hex-tile tap-to-command RTS. React UI wrapped around a
react-three-fiber/Three.js scene, simulated with a koota ECS, shipped to
web (GitHub Pages) and Android (Capacitor). Faithful reconstruction of the
game described in `references/conversation.md`.

## Profiles loaded

@/Users/jbogaty/.claude/profiles/arcade-game.md
@/Users/jbogaty/.claude/profiles/ts-browser-game.md
@/Users/jbogaty/.claude/profiles/mobile-android.md
@/Users/jbogaty/.claude/profiles/standard-repo.md

## Repo-specific

- **Run:** `pnpm dev` (vite)
- **Test (unit):** `pnpm test` (vitest)
- **Test (browser):** `pnpm test:browser` (vitest browser mode, real Chromium)
- **Test (e2e/visual):** `pnpm test:e2e` (playwright)
- **Build:** `pnpm build` (web) / `pnpm build:pages` (GitHub Pages) /
  `pnpm build:native` (capacitor sync)
- **Typecheck:** `pnpm check` (`tsc --noEmit`)
- **Lint/format:** `pnpm lint` / `pnpm format` (Biome)
- **Verify (pre-commit):** `pnpm verify` (check + lint + format + test)
- **Capacitor:** `pnpm cap:sync` after `capacitor.config.ts` or `android/` change
- **Asset ingest:** `pnpm assets:ingest` — curates `references/` → `public/assets/`

## Renderer

- Single `<Canvas>` (react-three-fiber) mounted under the gameplay shell.
  The Three.js scene is hoisted above the phase switch; phase changes swap
  sub-roots, never recreate the renderer.
- Phases: `launcher` → `playing` → `victory` / `defeat`.
- HUD overlays use `pointer-events-none` wrappers + `pointer-events-auto`
  panels so the canvas stays raycast-pickable underneath.
- The koota ECS is the single source of truth for simulation. r3f
  components READ ECS state and render it; they never own game state.

## Assets

- `references/` (git-ignored) is the curated source bundle: Kenney Hexagon/
  Nature/Castle/Town/Graveyard/TowerDefense kits, KayKit Adventurers (rigged
  heroes) + KayKit Mystery enemies (shared Rig_Medium/Rig_Large animation
  libraries), and OGG/WAV audio packs.
- `pnpm assets:ingest` curates it into `public/assets/{board,nature,structures,
  siege,characters,audio}/` + a generated `manifest.json`.
- Code references assets by stable logical id via the typed manifest accessor
  (`board.tile.grass`, `characters.heroes.knight`) — never raw paths.
- KayKit characters share skeletons; the shared Rig_Medium/Rig_Large animation
  GLBs are retargeted onto each character at load (drei useAnimations).
- Licensing: Kenney CC0, KayKit CC-BY (attribution screen required).

## Source layout

```
src/core/        hex math, dual-PRNG, A* graph — pure, no THREE/React
src/ecs/         koota world: components/, systems/
src/world/       terrain gen, biomes, ramps, board r3f components
src/entities/    character/building/resource r3f components, rig loader
src/render/      Canvas, lighting, day-night, camera, particles, water
src/audio/       howler buses, event→sound map
src/hud/         Radix + framer-motion HUD
src/game/        game state machine, selection/command, save/load
src/persistence/ SQLite save schema, Preferences settings
docs/specs/      pillar docs (source of truth)
docs/milestones/ per-milestone contract docs
```

## Determinism

- All RNG goes through `src/core/rng` (seedrandom). `Math.random()` is banned
  in `src/core/**`, `src/ecs/**`, `src/world/**`, `src/game/**`.
- Dual-stage PRNG: map seed (terrain/resources/ramps) + event seed (combat/
  weather/raids), both derived from the adjective-adjective-noun seed phrase.

## Reference material

- `references/conversation.md` — the described concept = the spec.
- `references/poc1.html` — last working build; proven logic, port logic only.
- `references/poc2.html` — broken "production" target; intent is the goal,
  code is NOT a source.
- Sibling project `../martian-trail` — the directly parallel arcade-cabinet
  game; same Capacitor/Vite/Playwright/koota/Radix stack pattern.
