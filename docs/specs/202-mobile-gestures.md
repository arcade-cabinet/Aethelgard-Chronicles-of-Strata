---
title: 202 — Mobile gesture map
updated: 2026-05-27
status: current
domain: product
---

# 202 — Mobile gesture map

## Purpose

Aethelgard ships to Android + iOS (Capacitor). Hotkeys are retired
(see `docs/specs/200-genre-commitment.md` mobile-first commitment).
Every interaction maps to a tap / multi-touch gesture. This doc is
the contract every HUD surface and renderer interaction must
honor; new features check this matrix before adding any input
handler.

## The matrix

| Gesture | Action | Implementation | Conflicts |
|---|---|---|---|
| tap | select / activate | onClick / onPointerUp | none |
| long-press (500ms) | open context menu | pointerdown + setTimeout | tap (use slop) |
| drag (single-finger, >8px) | pan camera | onPointerMove minus tap-slop | tap |
| pinch (two fingers) | zoom in/out | TouchList delta distance | drag (use finger count) |
| two-finger drag | orbit camera | TouchList delta center | pinch (use direction) |
| swipe-left/right (Toast) | dismiss toast | Radix swipeable | drag (route by surface) |

## Tap-slop budget

Tap-vs-drag disambiguation uses a **8 px** movement threshold
(matches Material Design's `touch slop`). A pointerdown that
moves more than 8 px before pointerup becomes a drag; less than
8 px is a tap. This applies to selection and to camera pan
equally; the same threshold avoids conflict.

## Long-press budget

A pointerdown held for **500 ms** with movement < 8 px fires
the long-press handler. The pointerup that follows the timeout
firing does NOT also fire the tap handler (the long-press
consumer calls preventDefault on the synthetic tap). This
budget matches Material Design and avoids competing with
fast-double-tap zoom gestures (browsers expect ~300 ms between
the two taps of a double-tap; long-press at 500 ms sits cleanly
after).

## Hit-target sizing

Every interactive element MUST have a hit area ≥ **48×48 dp**
(per Material Design + WCAG 2.5.5 AAA). Visual size can be
smaller; pad the hit area with `padding` or a covering
positioned element. Lighthouse + axe-core/playwright sweeps
fire on any sub-target.

## Per-surface gesture contracts

### Renderer / game board

- **Tap on tile**: select the tile's entity (Building / Unit /
  resource node). If no entity, deselect.
- **Tap on entity**: select.
- **Long-press on tile**: open context menu (move-here /
  attack-here / cancel).
- **Drag on board**: pan camera. The CameraRig consumes the
  drag once tap-slop is exceeded.
- **Pinch on board**: zoom. CameraRig's pinch handler clamps to
  min/max zoom from `docs/specs/40-camera.md`.
- **Two-finger drag**: orbit. CameraRig's orbit handler clamps
  to ±60° pitch.

### HUD surfaces

- **Tap on button / chip / radio**: activate.
- **Tap on Toast**: focus-tile (jump camera to the toast's
  associated entity if any).
- **Swipe-left on Toast**: dismiss.
- **Long-press on Discovery row / Atelier row**: future —
  show prereq chain in a popover.
- **Tap on Palace / Barracks**: open SelectionPanel with build/
  train list.

### Modal surfaces

- **Tap outside modal**: close (Radix Dialog convention; we
  preserve).
- **Tap on backdrop**: close.
- **Escape key**: close (keyboard-only fallback; never required
  for mobile flow).

## Forbidden patterns

- **Double-tap as a primary gesture**: conflicts with browser
  zoom; reserve for a future emergency.
- **Triple-tap, quad-tap**: never. No precedent.
- **Two-finger tap** (without drag): conflicts with iOS
  text-selection assist; never.
- **Right-click**: desktop-only convention; no mobile parallel.
  Use long-press for context menus instead.
- **Drag-and-drop across surfaces**: too easy to misfire on
  small screens; surface-internal drag (toast dismiss) is OK
  but cross-surface drag is forbidden.

## Implementation notes

- Use the **PointerEvent** API (not TouchEvent) for unified
  mouse + touch + stylus handling. The browser dispatches
  pointerdown / pointermove / pointerup for every input type;
  the `pointerType` field discriminates ('mouse' | 'touch' |
  'pen').
- Pinch and orbit require TouchEvent fallback because
  PointerEvent doesn't expose simultaneous touches in a
  cross-browser-stable way; CameraRig keeps a multi-pointer
  registry indexed by pointerId.
- Never call `preventDefault()` in pointermove; the browser's
  scroll / zoom handlers depend on the default action. Only
  preventDefault on pointerdown (to suppress synthetic clicks
  after long-press fires).

## Accessibility

- Every gesture has a keyboard equivalent for desktop a11y
  (tap → click / Enter; long-press → context-menu key or right-
  click; drag → arrow keys; pinch → +/- keys). The keyboard
  fallback is for desktop a11y compliance; mobile-first is the
  product target.
- aria-label every interactive surface; the tap-surface
  selector test (Maestro + axe-core) walks every `id=` in the
  HUD and asserts a matching aria-label.

## Audit cadence

A Maestro "tap-audit" flow runs the full HUD on a Pixel 5a
profile (see `.maestro/tap-audit.yaml` when M_V12.MOBILE.TAP-
AUDIT lands). Every tap target ≥ 48 dp; every gesture honors
the matrix above. Findings get filed under M_V12.MOBILE.HIT-
TARGET-FIX.

## References

- `docs/specs/200-genre-commitment.md` — mobile-first commitment
- `docs/specs/40-camera.md` — pan / zoom / orbit limits
- Material Design 3 — touch targets, hit areas, gesture matrix
- WCAG 2.5.5 (target size, AAA) — 44×44 CSS px minimum
- iOS HIG — touch + gesture conventions
