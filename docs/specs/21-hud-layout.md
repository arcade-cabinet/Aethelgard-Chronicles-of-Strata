# HUD Layout

The positioning contract for the in-game HUD. Every HUD commit checks
against this so surfaces stack predictably instead of fighting over the
same screen real estate. The tokens live in `src/hud/theme/hud-theme.ts`
and the slot helpers in `src/hud/theme/hud-layout.ts`; this doc is the
human-readable source of truth they encode.

## Coordinate model

The HUD mounts as a full-viewport overlay above the r3f `<Canvas>`. Each
surface is `position: absolute` inside that overlay (the overlay spans
the viewport, so absolute == viewport-anchored). Surfaces are
`pointer-events: none` by default; only their interactive panels opt
back in with `pointer-events: auto` so the board stays raycast-pickable
underneath.

## Top-center column

Several surfaces want the top-center slot. They MUST NOT overlap — they
stack in a fixed vertical order via `topCenterSlot(row)` +
`TOP_CENTER_SLOT` (`src/hud/theme/hud-layout.ts`):

| row | surface       | when shown                         |
| --- | ------------- | ---------------------------------- |
| 0   | FactionChips  | N-player matches (> 2 factions)    |
| 1   | ScoreBar      | always (live match score)          |

Each row is `safeTop(space.sm + row * TOP_ROW_HEIGHT)` from the top, so
the column clears the notch on device and keeps a margin on desktop. A
new top-center surface gets the NEXT row index — never a bare `top:`
literal. The faction-chips harness pins the no-overlap invariant
(`tests/harness/faction-chips.browser.test.tsx`).

## z-index ladder

Stacking order is named in `HUD_THEME.z` — never an ad-hoc integer:

```
board(0) < pills(10) < panels(20) < banners(30) < menu(40) < modal(50) < toast(60)
```

`toast` is intentionally the top of the stack: notifications must never
be occluded. A surface picks the band that matches its role
(`zIndex: HUD_THEME.z.pills` for a status pill, etc.).

## Spacing scale

Padding / gap / inset values come from `HUD_THEME.space` (a 4-based
ramp): `xs=4 sm=8 md=12 lg=16 xl=24`. Reach for `space.md` over a bare
`12`.

## Safe-area insets

Edge-anchored surfaces use the `safeTop / safeBottom / safeLeft /
safeRight` helpers, which wrap `env(safe-area-inset-*)` with a non-zero
desktop fallback (default `space.md`) so a surface clears the
notch/home-indicator on device AND keeps a margin on desktop, where the
env() resolves to 0. Pass an explicit px to stack a gap on top of the
inset: `safeTop(64)`.

## Tap targets

Every interactive HUD control meets the 48dp floor (`HUD_THEME.tapTarget`
/ the `.hud-tap-target` utility) — the Material / WCAG 2.5.5 minimum.
Compact pills keep their small visual chrome but carry a ≥ 48×48 hit box
(centered content + min-size). The mobile speed/pause pill harness pins
this (`tests/browser/mobile-speed-pause-pill.browser.test.tsx`).

## Keyboard focus

A global `:focus-visible` rule in `src/styles.css` gives every button /
`[role=button]` / `[role=menuitem]` / `[role=tab]` a gold focus ring on
keyboard focus only (mouse/touch stays ring-free). HUD components must
NOT set `outline: none` — doing so re-introduces the
no-focus-indicator bug. Pinned by `tests/browser/focus-rings.browser.test.tsx`.

## Accessibility gate

The axe-core sweep (`tests/browser/axe-a11y.browser.test.tsx`) scans
modals, pills, and overlays for WCAG 2.1 AA + best-practice violations.
A new interactive HUD surface gets an axe scan added there.
