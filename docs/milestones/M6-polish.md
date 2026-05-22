# M6 — Polish & Ship

**Proves:** The game is shippable — branded landing page, Radix + framer-motion
HUD, howler audio wired to every event, save/load, viewport-adaptive presentation,
and poc1-quality terrain. Delivered as one PR with the web (GitHub Pages) and
debug Android (Capacitor) builds.

**Status: COMPLETE.** 188 unit + 19 browser + 4 e2e tests green; `build:pages`
and `cap:sync` both succeed.

M6 absorbed three mid-milestone design corrections — each has its own spec:
`96-prng-and-landing.md` (split map/event PRNGs; New Game / Continue / Settings
landing page) and `98-viewport-and-config.md` (viewport architecture; constants
→ config). The yuka AI subpackage is deferred to M7.

## Contracts

- [x] **Branded landing page** — `TitleScreen` (New Game / Continue / Settings)
  replaces the single-input launcher. Gold-gradient Metamorphous "Aethelgard"
  heading, framer-motion header float. [`tests/browser/title-screen.browser.test.tsx`]

- [x] **New Game modal** — seed phrase with a randomize button (drawing from the
  event PRNG), map size (Huge device-gated), AI difficulty. [`tests/e2e/smoke.e2e.spec.ts`]

- [x] **HUD — Radix + framer-motion** — `ResourceBar` (slide-in, themed),
  `SelectionPanel` (slide-in, build/research buttons), all on the obsidian/gold
  `hud-theme`. [`tests/browser/selection-panel.browser.test.tsx`]

- [x] **Win/loss modal — accessible Radix Dialog** — `role="dialog"`, focus
  trap, keyboard-activable button. [`tests/browser/modal-a11y.browser.test.tsx`]

- [x] **Howler audio buses** — four buses (sfx/music/ambient/ui).
  [`tests/unit/audio-buses.test.ts`]

- [x] **Event → sound map** — combat hits, win/loss stingers, gameplay music,
  wired into the game loop via `useAudio`. [`tests/unit/audio-events.test.ts`]

- [x] **Mute toggle + persistence** — `SoundToggle`, persisted to Capacitor
  Preferences, restored on load. [`src/hud/SoundToggle.tsx`]

- [x] **Save / load — ECS round-trip** — `serializeWorld`/`deserializeWorld`.
  [`tests/unit/save-load.test.ts`]

- [x] **Auto-save** — a 5-minute timer wired into `runEconomyTick`, saving via
  the persistence facade. [`tests/unit/auto-save.test.ts`]

- [x] **lastSeed + event-seed preferences** — the last-played seed persists;
  `getEventSeed` buries the event-PRNG seed in Preferences.
  [`src/persistence/persistence.ts`]

- [x] **Credits** — `CREDITS.md` + `CreditsPanel` + the win-modal footer
  attribute KayKit, Kenney, PixelLoops. [`tests/unit/credits.test.ts`]

- [x] **GitHub Pages build** — `pnpm build:pages` produces `dist/` with the
  `/Aethelgard-Chronicles-of-Strata/` base path. CI deploys it.

- [x] **Android build** — `pnpm cap:sync` succeeds; CI assembles the debug APK.

- [x] **Build mode UI + click-to-select + research/rally HUD** — re-scoped from
  M3/M5; the `SelectionPanel` build/research buttons and `TileInteraction`
  click-routing (select / build / rally) wire the logic to the HUD.

## Mid-M6 additions (beyond the original plan)

- **Two-PRNG architecture** (`96`) — map PRNG (seed phrase) vs event PRNG
  (buried Preferences seed); the seed-phrase shuffle is an event draw, so no
  `Math.random` in the deterministic core.
- **Typed config loaders** — `src/config/{combat,economy,world}.ts`; the
  scattered `as`-cast JSON imports are gone and `core/constants.ts` is deleted —
  every value is configuration.
- **poc1-quality terrain** — one merged terrain mesh, real cone mountains, wooden
  ramps, layered water, fog, soft shadows. Verified against `references/poc1.png`.
- **Viewport architecture** (`98`) — `useViewport` classifies desktop /
  phone-landscape / phone-portrait; `CameraRig` gives zoom + pan + slicing; the
  minimap shows the camera slice; the HUD compacts for portrait.

## Deferred to M7

The yuka-backed AI subpackage (`src/ai/`) — the AI deserves its own subpackage,
not the `ecs/systems/ai.ts` slot. See the directive's M7 entry.
