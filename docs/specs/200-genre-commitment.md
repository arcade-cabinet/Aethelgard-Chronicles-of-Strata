---
title: Genre Commitment — RTS Only, Selectable-and-Automatable Peons
updated: 2026-05-25
status: current
domain: product
---

# Genre Commitment — RTS Only, Selectable-and-Automatable Peons

## The commitment

**Aethelgard is a real-time tactical strategy (RTS) game.** Full stop.

- No turns.
- No 4X scaffolding (no era progression, no diplomacy menus, no
  council screens, no research trees beyond what's already in
  Discoveries).
- No "hybrid" mode.

This frees the entire balance pass to optimize for RTS-shaped fun:
moment-to-moment decisions, sub-minute engagements, low-APM build
queueing, ZoC pressure, faction identity expressed through unit
silhouettes and combat tempo.

## Question stack (user direction 2026-05-25)

The 2026-05-25 design session asked four questions:

1. Treating all game elements as equal-weight when game types want
   different element-weights — should we commit to a genre?
2. Is this game fun as an RTS? Are we mistaken in not committing
   RTS-vs-4X?
3. Is automated peons the right call, or is it harming the game?
4. Should automated peons be a game option?

The user's final refinement: **"ditch turns and the 4x option
entirely so we can focus our balance on RTS mechanics. and we work
on balancing around the OPTION to select and automate a single or
multiple peons like any other unit."**

This doc encodes that decision.

## Why RTS, not 4X

1. **The PoCs are RTS-shaped.** `references/poc1.html` and
   `poc2.html` are both tap-to-command base + units + harvest +
   combat loops. The faithful-reconstruction mandate
   (`references/conversation.md` = the spec) names RTS mechanics.
2. **Mobile-first forces low-APM.** Aethelgard ships to Android+iOS
   first. 4X demands a desk-grade UI surface (panels, tree views,
   council screens) — possible on tablet, miserable on portrait
   phone. RTS with smart automation defaults is the genre that
   *belongs* on mobile (Bad North, Mindustry, Tooth and Tail).
3. **The middle is the trap.** Hybrid "Old World–lite" historically
   produces unshippable games — neither the snap of an RTS nor the
   long-arc rhythm of a 4X. Pick a side. RTS.
4. **Balance only converges if we commit.** Tuning peon harvest rate
   against combat DPS against ZoC pressure against weather events is
   already a 4-axis problem. Adding turn-bracketed pacing as a
   5th axis explodes the testing surface. Drop it.

## Peons — the architectural model

The user's clarifying instruction:

> "balancing around the OPTION to select and automate a single or
> multiple peons like any other unit"

This is *not* the "Skirmish RTS vs Commander RTS" mode-split the
prior draft of this doc proposed. It's something cleaner:

**Peons are selectable like any other unit. Automation is a verb
applied to the selection.**

### The model

Every peon has an `autoMode: 'manual' | 'auto'` field on its Unit
component.

- **Default on spawn**: `autoMode === 'auto'`. Peon obeys the
  current Skirmish behavior — picks a free resource node, harvests,
  returns to Palace, repeats. No player attention required.
- **On player selection** (single or multi-select via the new
  "Select all peons" / "Select all peons of biome X" actions):
  SelectionPanel exposes two actions:
  - "Take command" → flips `autoMode = 'manual'`. The peon stops
    its autonomous task and awaits orders. Idle indicator surfaces
    for it.
  - "Resume automation" → flips `autoMode = 'auto'`. Peon picks
    a fresh task from the global free-task queue and goes back to
    work. Idle indicator hides.
- **Tap-to-command on a manual peon**: directs harvest target,
  build site, attack-move, etc — same command verbs as any other
  unit, but contextualized for peons (no "attack", yes "harvest
  here", "build wall here").
- **Idle indicator scope**: peons with `autoMode === 'auto'` are
  NEVER counted in the idle indicator (by definition they're
  never idle). Peons with `autoMode === 'manual'` ARE counted.
  Military units (Knight, Pike, etc) are ALWAYS counted when idle.

### What this replaces

The prior split:

- ❌ "Skirmish mode → peons fully auto, non-interactable"
- ❌ "Commander mode → peons fully manual, idle indicator"

The new model:

- ✅ One game shape. Peons default-auto, selectable when the player
  wants to take direct control, returnable to auto when the player
  wants to delegate again.

This matches the actual Civ-VI Workers model (auto by default,
can be tasked manually) plus the AoE-IV villager pin-to-task model.
Strictly better than a hard mode-split.

### What this means for M_GAME.BUG.5

The prior directive item read: "peons non-interactable; idle
indicator removed because peons are never idle by definition."

Revised: peons ARE selectable; idle indicator gates on
`autoMode === 'manual'` for peons, `idle === true` for military.

`findSelectableAtTile` no longer skips peons. The peon-skip code
shipped in v0.1.20 reverts in M_GAME.MODE.PEON.1.

## What this means for the next implementation passes

Promoted to the directive (v0.10 cycle, RTS commitment):

- **M_GAME.MODE.RTS.1** — Strike all 4X scaffolding from the
  codebase scope. No `gameMode` enum. There is one game shape.
- **M_GAME.MODE.PEON.1** — Add `autoMode: 'auto' | 'manual'` to
  Peon Unit spawn. Default `'auto'`. Revert
  `findSelectableAtTile` peon-skip (peons ARE selectable now).
- **M_GAME.MODE.PEON.2** — SelectionPanel: when selection
  includes peons, expose "Take command" / "Resume automation"
  actions. When selection is mixed (peons + military), the
  action applies only to peons in the selection.
- **M_GAME.MODE.PEON.3** — `IdleUnitIndicator` (rename of
  `IdlePeonsIndicator`): counts peons with `autoMode === 'manual'
  && idle` + all idle military. Tap cycles through them with
  the auto-focus camera tween shipped in M_GAME.BUG.11.
- **M_GAME.MODE.PEON.4** — "Select all peons" / "Select all
  peons of biome X" multi-select actions on the sidebar (the
  M_GAME.BUG.4 replacement for drag-select that we already
  scoped).
- **M_GAME.MODE.PEON.5** — Peon free-task scheduler: when a
  peon flips back to `'auto'`, it MUST be able to find a fresh
  task immediately. The scheduler already exists for spawn-time
  task assignment; this just needs the re-queue hook on
  mode-flip.

Removed from scope (no longer pursuing):

- 4X mode card in NewGameModal — deleted.
- "Commander RTS" mode card — deleted.
- Single-Squad mode card — deleted (interesting but not in
  scope; if we want a tighter camera mode later it becomes a
  per-match camera-preset option, not a genre).
- Turn-bracketed wave commit ticks — deleted.
- The four-era game-mode lore framing — deleted.

## The classic RTS opening

User direction 2026-05-25: "we actually JUST start with some wood,
some stone, and a town hall zoomed in on the building, and players
decide what to build. it's an RTS not Civ."

This is the C&C / Warcraft / AoE opening pose, period:

- **Starting state per faction**: 1× Palace, 0 peons, 0 military.
- **Starting stockpile**: a small wood + stone amount, exact value
  to be tuned but sized so the player can immediately queue 2-3
  peons from the Palace without first having to do anything
  else.
- **Camera open pose**: zoomed in on the player's Palace
  (already shipped in M_GAME.BUG.8 — keep). The first thing the
  player sees is "this building is yours; what do you build first?"
- **No pre-spawned peons.** The current spawn-time peon-creation
  is deleted. Peons exist only because the player queued them.
- **No pre-spawned military.** Same.
- **No pre-spawned enemy units either.** Enemy starts identically
  (symmetric opening). AI player begins issuing build orders from
  frame 0 of its own.

The fun loop:

1. **Tick 0** — see Palace, see "you have 80 wood / 60 stone,"
   tap Palace, queue peons.
2. **Tick 0-30s** — first peons spawn, auto-mode picks up
   harvest tasks. Stockpile starts growing.
3. **Tick 30-60s** — player decides: scout? build a Barracks for
   military? build a Wall for defense? more peons for economy?
4. **Tick 60s+** — Discoveries start triggering, ZoC borders
   start meeting, the actual game.

This is the proper RTS arc — economic ramp → military buildup →
engagement. The current build skips step 1 (peons + Palace
pre-spawned), which is why the early game feels eventless.

Promoted to the directive:

- **M_GAME.MODE.RTS.OPEN.1** — Faction spawn delivers ONLY the
  Palace. Wipe pre-spawned peons and pre-spawned military.
- **M_GAME.MODE.RTS.OPEN.2** — Add `startingStockpile: { wood,
  stone, gold? }` to the faction spawn config. Defaults tuned
  for "2-3 peons queueable on tick 0."
- **M_GAME.MODE.RTS.OPEN.3** — Palace must expose "Queue Peon"
  as the prominent first-action affordance from frame 0. When
  Palace is selected and the player has stockpile to spawn a
  peon, the action button is highlighted (faction-colored halo).
- **M_GAME.MODE.RTS.OPEN.4** — AI player applies the same opening
  — symmetric start, no AI gets pre-spawned advantage.
- **M_GAME.MODE.RTS.OPEN.5** — Onboarding overlay update: the
  first step should be "Tap your Palace, queue 2 peons" not
  "your peons are already harvesting; tap one to see..."

## What this means for camera + HUD

- The platter rotation + horizon fog + auto-focus tween shipped in
  M_GAME.BUG.11 are RTS-correct as designed. Keep.
- The minimap stays mounted at all times (M_HUD.SHELL strategic-
  overview rule). Keep.
- The toast system (M_HUD.NOTIF.1) becomes more important, not less:
  the player needs to know when a ZoC border is breached, when a
  manual peon goes idle, when a wave triggers, etc. — because they
  no longer have a turn-end recap to catch up at.
- Cinematic camera presets ("close on selection" vs "wide overview")
  become a player preference toggle, not a mode toggle.

## Decisions on prior open questions

User direction: decide everything now, don't defer.

- **Peon `autoMode` persistence across saves: YES.** Persisted in
  the save schema as part of the Unit component. A player who took
  command of a peon for a scout job loses no progress on save/load.
  Wired into M_GAME.MODE.PEON.1.
- **Automated peons broadcasting per-task toasts: NO.** Toast spam
  destroys the calm-economy feel. Only the FIRST peon to pick up a
  task type after a new player session emits a "Your peons have
  begun harvesting wood / stone / gold." narrator-voice toast,
  capped at one per resource type per match. After that, peon work
  is silent. Wired into M_HUD.NOTIF.PEON.1.
- **SelectionPanel per-unit command verbs: SPLIT.** Peons get
  `Harvest here`, `Build here`, `Repair`, `Return to Palace`,
  `Take command` / `Resume automation`. Military get `Attack-move`,
  `Patrol between A and B`, `Hold position`, `Fall back to Town
  Hall`. Mixed selection shows the INTERSECTION (Return to Town
  Hall, Hold position) plus a per-unit-type dropdown sub-menu.
  Wired into M_GAME.MODE.PEON.6 (new).
- **Discoveries auto-mode + manual-mode interaction: AUTO ONLY
  TRIGGERS ON AUTO PEONS.** A peon flipped to manual whose player
  walks them into a Discovery tile still triggers the Discovery
  (player initiative shouldn't be punished). But the
  "first-discovery" narrator beat goes off the FIRST trigger
  regardless of mode.
- **Camera close-on-selection toggle: PLAYER PREFERENCE.** A
  Setting in SettingsModal under a new "Camera" group: "Auto-focus
  on selection" (default ON). When OFF, the auto-focus tween from
  M_GAME.BUG.11 still functions when explicitly invoked by
  toasts/sidebar buttons, but tap-selecting a unit doesn't move
  the camera. Wired into M_HUD.SHELL.CAMERA.1 (new).
- **Toast cap / queue policy: 3 SIMULTANEOUS, OLDEST DISMISSES.**
  Radix Toast supports a swipe-dismiss model; we keep the most
  recent 3 toasts visible, FIFO oldest dismisses when a fourth
  fires. Critical toasts (enemy at Palace, Wonder completed)
  bypass the cap and stack on top. Wired into M_HUD.NOTIF.2 (new).
- **Starting stockpile values: 80 wood / 60 stone / 0 gold.**
  Sized so a Peon costs 30 wood (≈ 2.6 peons queueable) and a
  basic Wall costs 20 stone. Player can immediately queue 2 peons
  AND drop a defensive wall tile, but can't skip economy and rush
  military. Tuned to first-playable economic ramp; revisit after
  AIVAI playtest.
- **Pre-spawned enemy AI: SYMMETRIC.** Enemy AI gets the same
  Palace + same stockpile. AI's first scheduler tick runs at
  frame 0 and immediately queues 2 peons. No headstart, no
  asymmetric advantage. AI difficulty axis is in decision quality,
  not in starting resources.
- **Map size + RTS pacing: KEEP M_GAME.BUG.9 sizes.** The bumped
  map sizes (small 26 → huge 58) are CORRECT for the new RTS
  opening — bigger maps give the economic ramp time to play
  before ZoC borders meet. Peon roam radius (M_GAME.BUG.10) is
  STILL needed because manual-mode peons should still be
  walk-clamped to "your sphere of influence" by default unless
  the player explicitly orders them past it.
- **Palace destruction = match loss: KEEP.** The pre-spawned-
  peons removal doesn't change the victory condition. Player loses
  when Palace is destroyed; player wins by destroying enemy
  Palace (or hitting Wonder victory threshold first).
- **What happens if the player ignores the Palace and just
  pans around for 5 minutes?** Onboarding overlay never
  auto-dismisses; the first step ("tap your Palace, queue 2
  peons") stays visible until the action is taken. After 30s of
  no-action, a gentle narrator toast: "Aethelgard awaits your
  first decree." After 90s, a stronger one: "Your realm cannot
  grow without peons." Player can dismiss either toast but the
  onboarding step persists. Wired into M_GAME.MODE.RTS.OPEN.6
  (new).
