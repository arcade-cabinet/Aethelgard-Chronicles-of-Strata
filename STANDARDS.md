# STANDARDS.md — Aethelgard Code Quality Non-Negotiables

These are hard gates, not guidelines. Violations block merge.

## TypeScript: Strict, No Escape Hatches

- `tsconfig.json` has `strict: true`, `noUncheckedIndexedAccess: true`,
  `exactOptionalPropertyTypes: true`, `noUnusedLocals: true`, `noUnusedParameters: true`.
- `as any` is banned in all `src/` files. Biome's `noExplicitAny` rule is set to
  `"error"`. If the types are wrong, fix the types.
- `// @ts-ignore` and `// @ts-expect-error` require a comment explaining exactly what
  upstream bug they work around and a link to the upstream issue. Used at most twice
  per release cycle; if a third is needed, fix the root cause instead.
- `verbatimModuleSyntax: true` — type-only imports use `import type`.

## Determinism: The RNG Facade

All random values in simulation code must flow through `src/core/rng`:
- Map generation uses the map seed stream (seeded from cyrb128(seedPhrase)).
- Event variance (combat, weather, raids) uses the event seed stream.
- `Math.random()` is banned in `src/core/`, `src/ecs/`, `src/world/`, `src/game/`.
  The gates.json ban_patterns rule enforces this with a commit-time check.

Determinism invariant: same seed phrase → same board + same event sequence on every
platform (browser, Android APK, CI) and every run. A seed phrase is a promise to the
player. Breaking it is a P0 bug.

## Biome Palette: The Brand Gate

The biome colors defined in `docs/specs/20-visual-language.md` are the brand. Any
change to these values is a visual spec revision — it requires updating the spec doc,
updating any snapshot tests that reference the values, and explicit justification in
the commit message. Do not silently drift palette colors.

Reference palette (from poc1.html):
- OCEAN `#0ea5e9`, LAKE `#38bdf8`, BEACH `#fde047`, DESERT `#d97706`
- GRASS `#84cc16`, FOREST `#15803d`, HIGHLAND `#64748b`, MOUNTAIN `#475569`

Flat shading is the visual identity. `MeshStandardMaterial` with `flatShading: true`
on every terrain tile. No smooth normals on game-world geometry.

## Visual Ownership: The Agent Screenshots

Before committing any change to `src/render/**`, `src/hud/**`, `src/world/**`,
`src/entities/**`:

1. Boot the dev server or build.
2. Take a screenshot (chrome-devtools-mcp or a Playwright script).
3. Read the screenshot with vision.
4. Compare against the palette and layout spec.
5. If wrong — fix before committing.

"Self-feedback: needs polish" followed by a commit is a bug. The user should never be
the first to notice a T-pose, a wrong palette color, or a misaligned HUD element.

## Conventional Commits

Every commit message: `<type>[optional scope]: <description>`

Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`, `ci`, `build`.

Breaking changes: `feat!:` or `BREAKING CHANGE:` footer.

No "WIP", "fix stuff", "misc", or emoji-only messages. The commit message is the
changelog entry.

## Module Structure

Decompose by responsibility, not line count. A 400-line type catalog is fine; a
250-line file owning three subsystems is not. The reader-can-hold-it-in-head test is
the gate. Files over 600 lines generate a warning from gates.json — treat it as a
prompt to split.

Every module has one owner: `src/core/` for pure simulation math, `src/ecs/` for
systems + components, `src/render/` for r3f scene objects, `src/hud/` for React UI,
`src/game/` for the game state machine, `src/assets/` for the manifest accessor.
Cross-boundary imports flow one way: render reads ECS, ECS does not import render.

## No Stubs or TODOs in Committed Code

`pass`, `TODO`, `FIXME`, `as any`, `it.todo`, `throw new Error('not implemented')`
are bugs in committed code. If a feature is out of scope for the current milestone,
it does not appear in the code at all — it appears in the next milestone's spec doc.
