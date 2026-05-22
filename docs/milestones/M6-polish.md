# M6 — Polish

**Proves:** The game is shippable. One APK + one GitHub Pages deploy. HUD is fully
implemented with Radix + framer-motion. Howler audio is wired to all events. Save/load
works on both web and Android. Branding matches poc2.html.

**M6 is complete when all contracts below are checked, CI is green, and the APK and
Pages deploy have been verified.**

Detailed test files are written as the first act of M6 (milestone-TDD batch).

## Contracts

- [ ] **Launcher — fonts, layout, animations** [`tests/visual/launcher.spec.ts`]
  - Playwright screenshot of launcher matches reference `tests/visual/refs/launcher.png`.
  - "Aethelgard" heading uses Metamorphous font, gradient gold.
  - "Chronicles of Strata" subtitle is uppercase Inter, accent blue.
  - Header float animation is active (translate difference between two screenshots).
  - Ref: `90-ui-hud.md §Launcher`.

- [ ] **Launcher seed input + randomize** [`tests/e2e/launcher-seed.spec.ts`]
  - Click randomize button: seed input fills with adjective-adjective-noun phrase.
  - Click randomize again: input changes to a different phrase.
  - Type a custom seed; click "Enter Realm": game starts with that seed.
  - Ref: `90-ui-hud.md §Launcher`.

- [ ] **HUD panel slide-in animation** [`tests/visual/hud-animation.spec.ts`]
  - Playwright: record screenshots at t=0ms and t=400ms after game start.
  - HUD panel is at `x: -40` at t=0, `x: 0` at t=400ms (slide-in complete).
  - Ref: `90-ui-hud.md §framer-motion Transitions`.

- [ ] **Radix Dialog — win modal accessible** [`tests/browser/modal-a11y.test.ts`]
  - Win modal: focus is trapped inside the dialog when open.
  - "Re-enter Aethelgard" button is focusable and activable via keyboard.
  - Modal has correct ARIA role `dialog` and `aria-modal: true`.
  - Ref: `90-ui-hud.md §Win / Loss Modal`.

- [ ] **Howler buses initialized and playing** [`tests/unit/audio-buses.test.ts`]
  - `createAudioBuses()` returns four buses: sfx, music, ambient, ui.
  - `bus.music.play("music-menu")` starts a Howl instance (mocked in node tests).
  - `Howler.mute(true)` silences all buses; `Howler.mute(false)` restores.
  - Ref: `80-audio.md §Bus Model`.

- [ ] **Event → sound map wired to all game events** [`tests/unit/audio-events.test.ts`]
  - For each event in `80-audio.md §Event → Sound Map`: a spy on the correct bus
    `play()` method fires when the game event fires.
  - No event in the map is unwired (i.e., no event fires silently).
  - Ref: `80-audio.md §Event → Sound Map`.

- [ ] **Mute toggle persists across reload** [`tests/e2e/mute-persist.spec.ts`]
  - Playwright: click mute toggle → verify "🔇 Audio OFF" label.
  - Reload page → verify mute state is restored (label still "🔇 Audio OFF").
  - Ref: `80-audio.md §Mute Toggle`, `95-persistence.md §Preferences Keys`.

- [ ] **Save and load — ECS state round-trips** [`tests/unit/save-load.test.ts`]
  - Build a small world: 2 peons, 1 footman, 1 farm, 50 gold.
  - Serialize via `persistence.save("Test")`.
  - Restore via `persistence.load(saveId)`.
  - Assert: entity count matches, gold matches, Footman's HexPosition matches.
  - Ref: `95-persistence.md §Save / Load Flow`.

- [ ] **Auto-save fires every 5 minutes** [`tests/unit/auto-save.test.ts`]
  - Simulate 300 seconds of game clock.
  - Assert `persistence.save("AutoSave")` was called at least once.
  - Ref: `95-persistence.md §Auto-Save`.

- [ ] **lastSeed preference pre-fills launcher** [`tests/e2e/last-seed.spec.ts`]
  - Playwright: complete a game with seed "brave-iron-dragon".
  - On next page load: launcher seed input contains "brave-iron-dragon".
  - Ref: `95-persistence.md §Preferences Keys`, `90-ui-hud.md §Launcher`.

- [ ] **Credits — KayKit attribution in CREDITS.md and credits screen** [`tests/unit/credits.test.ts`]
  - `CREDITS.md` contains the string "KayKit by Kay Lousberg".
  - The win modal footer (or a dedicated credits screen) contains the same attribution.
  - Ref: `30-asset-pipeline.md §Licensing`.

- [ ] **GitHub Pages deploy** [manual verify]
  - `pnpm build:pages` produces `dist/index.html` with base path
    `/Aethelgard-Chronicles-of-Strata/`.
  - GitHub Pages workflow runs green on `main`.
  - Deployed URL loads the launcher in Chromium without console errors.
  - Ref: `99-build-deploy.md §GitHub Pages Deploy Workflow`.

- [ ] **Android APK builds** [manual verify]
  - `pnpm build && pnpm cap:sync && ./gradlew assembleDebug` exits 0.
  - `app-debug.apk` is present in `android/app/build/outputs/apk/debug/`.
  - APK installs and runs on an Android 12+ device/emulator; launcher appears.
  - Ref: `99-build-deploy.md §Native (Capacitor Android)`.

- [ ] **Build mode UI + build progress ring** [`tests/browser/build-mode-hud.test.ts`]
  - Re-scoped from M3: the buildSystem and Buildings render are built and tested;
    M6 adds the build-button HUD that places a Farm and the progress ring shown
    while it constructs.
  - Ref: `70-rts-systems.md §Build Mode`, `90-ui-hud.md §Selection Panel`.

- [ ] **Click-to-select + selection ring interaction** [`tests/browser/selection.test.ts`]
  - Re-scoped from M3: SelectionRing renders for any isSelected entity (built);
    M6 wires a unit tap to toggle Selectable.isSelected so the ring follows the
    player's selection.
  - Ref: `60-characters.md §Character Rendering`, `90-ui-hud.md §Selection Panel`.
