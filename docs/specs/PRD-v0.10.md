---
title: PRD v0.10 — HUD overhaul, design language, mobile-first testing
updated: 2026-05-25
status: current
domain: product
---

# PRD v0.10 — HUD overhaul, design language, mobile-first testing

**Status:** ACTIVE (in-flight on `feat/hud-overhaul-responsive-shell`)
**Cycle goal:** Pivot from feature-add to design-language coherence. Aethelgard ships to Android + iOS via Capacitor; the HUD must be readable, tappable, and beautiful across foldable / tablet / phone / desktop without overcrowding. The design language is unified — semantic tokens, dual theme, distilled primitives — instead of per-page reimplementations.

## Why this cycle

The OnePlus Open foldable bug (overcrowded top bar with WOOD/STO/SUPPLY/EN/Player 0/2/5/6/"Reach the final era" all crammed left-to-right + Legend/Discoveries/Resign as fighting pills below) surfaced a deeper truth: Aethelgard's HUD was built feature-by-feature with no underlying design language. Every new pill found a corner of the screen; nothing was composed.

Mean-streets (a sibling arcade-cabinet game) was studied and its discipline adopted:
- `src/ui/theme/tokens.css` — semantic token names (`--bg-panel`, `--text-hot`, `--surface-button-primary`), never raw hex in components.
- `.maestro/*.yaml` — pure tap-driven mobile e2e flows. `tapOn: { id: "..." }` on every interactive.
- `scripts/capture-visual-fixtures.mjs` — boots vite, sweeps Playwright across desktop + iPhone + Pixel + iPad viewports, screenshots each screen by testid.
- `src/test/FixtureApp.tsx` — `?fixture=<name>` URL routing renders ONE screen in isolation with mocked props so visual capture doesn't need to drive the whole flow.

Aethelgard adopts the same discipline, layered over 21st.dev Magic MCP's library-composition guidance (Tailwind v4 `@theme`, declarative `@react-three/postprocessing`, Radix primitives, framer-motion's `useReducedMotion`/`AnimatePresence`, lucide-react). Magic is treated as a teacher of modern patterns, not a paste-the-mockup tool — patterns get distilled into the design language; only the per-page COMPOSITION uses them directly.

## Architectural decisions

1. **Mobile-first testing posture.** GitHub Pages is the testing surface; Android + iOS are the permanent targets. Every interactive surface has `aria-label` + `data-testid`/`id`. Tests exercise tap paths, not keyboard. Maestro flows live in `.maestro/` and run against the released APK + IPA. Vitest browser-mode + Playwright e2e cover the same flows for CI on the web build.

2. **Keyboard nav is a desktop convenience subpackage.** Not deleted (decompose, don't strip): `src/hud/desktop-keyboard/` mounts only on `viewport.class === 'desktop' | 'ultraWide'` and owns the kbd shortcuts + the kbd-hint popover. The previous "strip" of kbd from TitleScreen + OnboardingOverlay becomes a clean extraction.

3. **Semantic tokens in `src/styles.css`.** Names: `--color-bg`, `--color-surface`, `--color-surface-solid`, `--color-surface-elevated`, `--color-on-surface`, `--color-on-surface-muted`, `--color-on-surface-subtle`, `--color-divider`, `--color-border`, `--color-border-strong`, `--color-accent`, `--color-accent-strong`, `--color-accent-soft`, `--color-treasure`, `--color-treasure-strong`, `--color-treasure-soft`, `--color-friendly`, `--color-danger`, `--color-warning`, `--color-wood`, `--color-stone`, `--color-coin`, `--color-supply`. Plus motion (`--ease-emphasized`, `--duration-fast/default/slow`), z-lanes (`--z-canvas / --z-hud-* / --z-modal-*`), safe-area, fonts. Legacy `--color-obsidian / --color-gold-hud / --color-accent-hud` aliases preserved during the file-by-file migration. Dual theme via `[data-theme='light']` selector switching the entire palette in one place.

4. **`useTheme()` bridges to OS preference.** `src/lib/theme.ts` exposes `[theme, setTheme]`. Resolves from: persisted user override → `matchMedia('(prefers-color-scheme: light)')` (works on both web and Capacitor WebView) → fallback 'dark'. Writes `<html data-theme="…">`. Listens to matchMedia change events. Broadcasts `aethelgard:theme-changed` for cross-surface sync (audio bus damping in light theme, PBR shader uniform swap, etc).

5. **Distilled primitives subpackage `src/hud/primitives/`.** Patterns the Magic explorations surfaced — extracted into reusable components instead of being re-implemented per page:
   - `<HeroBanner>` — gradient strip with lucide icon-tile + counter label (used by OnboardingOverlay step header, SettingsModal section markers).
   - `<Halo>` — pulsing radial behind a hero icon (used by GameOverModal Trophy/Skull/Scale, future achievement-unlock toast).
   - `<TreasureButton>` — THE primary CTA pattern (used by TitleScreen New Game, NewGameModal Begin Match, OnboardingOverlay Begin Realm, GameOverModal Re-enter Aethelgard).
   - `<SectionCard>` — bordered card with icon + heading + caption (used in NewGameModal World/Mode/Opponents/Players sections, SettingsModal sections).
   - `<StepProgressDots>` — pill row indicator (used in OnboardingOverlay, future PackOpening if added).
   - `<IconButton>` — bordered icon-only button (used in TitleScreen icon strip, SystemMenu close X, every modal's close).

6. **Visual fixture battery + `?fixture=` URL.** `scripts/capture-aethelgard-fixtures.mjs` modeled on mean-streets' equivalent. `src/test/FixtureApp.tsx` switches on `?fixture=<name>` and renders one screen with mocked props. Per-viewport sweep: desktop (1440×900) / iPhone 14 / Pixel 7 / iPad Mini / foldable-portrait / foldable-landscape / ultrawide. Run before every HUD PR.

7. **Maestro flow battery.** `.maestro/config.yaml` + `.maestro/smoke.yaml` (`tapOn: id="menu-new-game"`, `tapOn: id="begin-game"`, `tapOn: id="onboarding-next"` ×9, `assertVisible: id="game-screen"`) + `.maestro/full-game.yaml`. Runs against the Capacitor APK + IPA in CI.

## Work-units (shipped)

| Item | Commit / PR | What it does |
|---|---|---|
| M_HUD.SHELL.1 | PR #62 (merged) | Universal SystemMenu hamburger + slide drawer |
| M_HUD.SHELL.2 | PR #64 | Cinematic TitleScreen with PBR shader hero + bloom + chromatic-aberration |
| M_HUD.SHELL.3 | local | NewGameModal "Forge Your Realm" — card-grouped sections, sticky readout chips, gold Begin CTA |
| M_HUD.SHELL.4 | local | OnboardingOverlay tome-by-candlelight stepper with hero gradient strip + lucide step icons |
| M_HUD.SHELL.5 | local | GameOverModal Victory/Defeat/Draw with Trophy/Skull/Scale heroes + pulsing halo + gradient titles |
| M_HUD.SHELL.6 | local | Semantic-token design language + dual theme + `useTheme()` hook + Capacitor-aware OS preference |
| M_HUD.SHELL.6.kbd | local | Retire kbd-hint UI from TitleScreen + OnboardingOverlay (mobile-first) |

## Work-units (in-flight / next)

See directive § "v0.10 work-units" sections B-E.

## Determinism + safety contract

- The HUD layer is pure presentation; no game-state mutation. Determinism guarantees from earlier cycles remain in force.
- All 142+ browser tests still green after each commit.
- Theme resolution is async (Preferences read + matchMedia query) — first paint may flash dark before resolving; the matchMedia hint is read SYNCHRONOUSLY on first paint to avoid the flash on the title screen entry.
- prefers-reduced-motion gate is honored everywhere (idle bobs frozen, halo pulses disabled, step transitions become instant).
- No new game logic in this cycle; pure UX overhaul.

## Process improvements shipped

- **Memory: `magic-mcp-prompt-protocol.md`** — 15-rule briefing protocol for every Magic call.
- **Memory: `mobile-first-design-discipline.md`** — mean-streets reference + Maestro pattern + visual-fixture battery + `?fixture=` URL routing + semantic token discipline.
- **Decompose, don't strip** is now the doctrinal default for any "remove this feature" instinct.
- **Visual self-judge every UI commit** before claiming done. When the user has to point out "you're not running a chrome instance" that's a process bug equal to a missed test — patch the loop, not just the pixel.

## What did NOT ship in v0.10 (rolls to v0.11)

- **Maestro flow battery + APK/IPA integration** — substrate landed in directive M_HUD.SHELL.11; flows authored in v0.11.
- **Full visual fixture battery + `?fixture=` URL routing** — directive items M_HUD.SHELL.12/13; substrate in v0.11.
- **PBR shader CSS-var reading for light theme** — currently the shader stays obsidian-themed even when `data-theme="light"`; M_HUD.SHELL.8.
- **In-game HUD shell composition pass** for the OnePlus Open overcrowding case — M_HUD.SHELL.20. The SystemMenu drawer pulled the worst offenders off the top bar but ResourceBar + FactionChips + WinPill still need their own composition pass.
- **Distilled primitives subpackage** — M_HUD.SHELL.10. Patterns are in `@layer components` utility classes for now (`.btn-treasure`, `.surface-card`, `.btn-ghost-icon`, `.kbd-chip`); the React-component extraction is next.
