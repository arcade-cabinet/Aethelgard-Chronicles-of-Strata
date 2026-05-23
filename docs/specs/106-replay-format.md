---
title: Replay format (M_EXPANSION.F.74 + .F.75 + D.162)
updated: 2026-05-23
status: current
domain: technical
---

# Replay format

A replay is a deterministic re-play of a session: same seed +
ordered list of player commands reproduces the same world frame-by-
frame. The export is a single newline-delimited JSON file
(`.aethelgard-replay.ndjson`).

## Wire format

Each line is one of:

```jsonl
{"t":"header","version":1,"seedPhrase":"…","eventSeed":"…","mapSize":12,"difficulty":"normal","mode":"red-vs-blue"}
{"t":"cmd","elapsed":1.234,"faction":"player","verb":"moveUnit","args":[…]}
{"t":"cmd","elapsed":2.300,"faction":"player","verb":"placeBuilding","args":[…]}
…
{"t":"footer","outcome":"win","elapsed":612.5,"score":{"player":1.2e5,"enemy":4.4e4}}
```

## Recording

A new `EventLog` slot on `GameState` (optional, opt-in per
session). Every command in `src/game/commands.ts` that mutates
state appends one row before applying the verb. The append is
synchronous + cheap (push to an array). The log lives in memory
until export.

## Replay playback

Loading a replay:
1. Read the header → call `startGame(seedPhrase, eventSeed, mapSize,
   difficulty, mode)`.
2. Wall-clock advance the sim; at each `elapsed` boundary, dispatch
   the recorded command verb through the existing commands.ts API
   (with `replayMode=true` so observer events don't fire double).

Determinism contract: every command verb is pure (input ECS state +
input args → output ECS state). Since RNG goes through the event-
PRNG seeded from the header, every roll reproduces.

## Schema

The format carries its own version. Replay loaded with version > 1
errors with "replay too new". Migrations land here when commands.ts
extends.

## Out of scope

- Visual replay control (pause / scrub / speed) — that's the UI
  layer once the data flow lands.
- Multiplayer command sync (a future feature).
- Per-frame ECS state diffs (snapshot every frame is too expensive;
  the command-sequence playback is the equivalent).

## Implementation steps (each its own commit)

1. EventLog slot on GameState + opt-in via NewGameConfig.recordReplay
   (default off — recording has a 1-2KB/min memory cost).
2. Wire every commands.ts verb to append via `recordReplayEvent(game, ...)`.
3. Export verb: serialize to ndjson, trigger download (a new HUD
   button under Settings → Replays).
4. Import verb: file picker → ndjson parser → replay-playback loop.
5. Tests: round-trip a 30-command sequence; assert the world state
   matches the recorded final ECS snapshot.
