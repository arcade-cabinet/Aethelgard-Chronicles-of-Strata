# Audio

> **M_ARCH_UNIFY cross-reference (added 2026-05-23).** Pre-dates the
> unified Thing/Skin registry. The 4-layer model — Archetypes → Things
> → Slots → Skins — is the authoritative architectural shape for every
> visual/data fork in the codebase. See:
>
> - `docs/specs/103-particle-archetype.md` — keystone architectural pass
> - `docs/specs/10-architecture.md` — pillar's full M_ARCH_UNIFY block
> - `src/rules/building-profiles.ts` — Thing registry (M_REGISTRY.5)
> - `src/rules/unit-profiles.ts` — Thing registry (M_REGISTRY.1)
> - `src/rules/skins.ts` — Skin slot (M_REGISTRY.3/4/2)
>
> Per-section notes below mark where THIS pillar's text became
> superseded or extended by the unified-registry doctrine.

## Technology

Howler.js (`howler`) manages all audio. It is loaded imperatively from `src/audio/` —
not as a React hook — so the audio system survives component re-renders and ECS state
changes without restarting.

## Bus Model

Four independent buses. Each bus has its own volume control and mute flag. The global
mute toggle (HUD sound button) mutes all buses simultaneously.

| Bus | Purpose | Howler group |
|---|---|---|
| `sfx` | One-shot positional effects (footsteps, hits, harvests, build sounds) | Stereo or panned by world position |
| `music` | Background music loops (menu, gameplay, tavern variants) | Stereo, fades between tracks |
| `ambient` | Environmental loops (birdsong, rain, wind, dungeon drone) | Stereo, crossfades on weather change |
| `ui` | UI interaction sounds (button click, select chime, notification) | Stereo, no panning |

## OGG-Primary / WAV-Fallback Rule

All audio files are provided as OGG (primary) with a WAV fallback. Howler.js
automatically selects the format the browser supports. The manifest lists both files
for each audio asset; the accessor returns an array `[oggPath, wavPath]` which is
passed directly to Howler's `src` array option.

```typescript
new Howl({
  src: [assets["audio/footstep-grass"], assets["audio/footstep-grass-wav"]],
  volume: 0.6,
});
```

## Event → Sound Map

> **M_REGISTRY.20 (planned)** — this event→asset table will move onto
> the Skin slot as `SKINS[faction].audio[event]`. A third tribe defines
> its own `audio` map (e.g. necromancer footsteps = bone-clack); the
> encroachment `faction === 'player'` critical-alarm hard-branch
> collapses into a Skin slot read. The data shape below remains
> authoritative; the location migrates.

```mermaid
flowchart LR
  subgraph Slot["SKINS[faction].audio (future, M_REGISTRY.20)"]
    EV1[footstep-grass]
    EV2[footstep-sand]
    EV3[combat-hit]
    EV4[critical-alarm]
    EVN[…]
  end
  subgraph Player["SKINS.player.audio"]
    P1[default sfx pack]
  end
  subgraph Enemy["SKINS.enemy.audio"]
    E1[default sfx pack]
  end
  subgraph New["SKINS.NEW_TRIBE.audio (one row to add)"]
    N1[custom sfx pack]
  end
  Event[(game event)] -->|skinFor.audio[event]| Slot
  Slot -->|asset id| Howler[(Howler bus)]
```


|---|---|---|---|
| Peon footstep on GRASS | `audio/footstep-grass` | sfx | Triggered every ~0.5s while moving |
| Peon footstep on BEACH | `audio/footstep-sand` | sfx | |
| Peon footstep on DESERT | `audio/footstep-dirt` | sfx | |
| Peon footstep on HIGHLAND/MOUNTAIN | `audio/footstep-stone` | sfx | |
| Harvest swing (wood) | `audio/harvest-chop` | sfx | On each harvest animation swing |
| Harvest clink (stone/gold) | `audio/harvest-clink` | sfx | On each harvest animation swing |
| Carry deposit at Town Hall | `audio/deposit-chime` | sfx | On resource deposit |
| Unit selected | `audio/select-unit` | ui | On click/tap of any selectable entity |
| Build hammer strike | `audio/build-hammer` | sfx | Each construction progress tick |
| Building complete | `audio/build-complete` | ui | When `Building.isComplete` flips true |
| Combat hit (player strikes enemy) | `audio/combat-hit` | sfx | Per damage application |
| Combat hit (enemy strikes player) | `audio/combat-hit-heavy` | sfx | Slightly different timbre |
| Unit death | `audio/unit-death` | sfx | On AnimationState → DYING |
| Victory stinger | `audio/victory-stinger` | music | On win condition; plays once over music fade |
| Defeat stinger | `audio/defeat-stinger` | music | On loss condition; plays once over music fade |
| Weather: rain start | `audio/rain-start` | ambient | Short crossfade from birdsong |
| Weather: fog start | `audio/fog-drone` | ambient | Drone loop |
| Weather: sunny return | `audio/birdsong` | ambient | Crossfade back |
| Button click (any HUD button) | `audio/ui-click` | ui | Low-volume, snappy |
| Seed randomize | `audio/ui-swoosh` | ui | On randomize button press |

## Music Logic

Music transitions are smooth (1–2 second crossfades). The music bus plays one track
at a time.

| Game phase | Track | Notes |
|---|---|---|
| Launcher / menu | `audio/music-menu` | Ambient fantasy loop; plays before game start |
| Gameplay (base) | `audio/music-gameplay` | RPG adventure loop; starts when game begins |
| Tavern/peaceful (economy phase) | `audio/music-tavern` | Layered onto gameplay track when no combat for 60s |
| Combat active | `audio/music-combat` | Triggered by first combat hit; replaces tavern layer |
| Victory | `audio/victory-stinger` then `audio/music-menu` | Stinger plays; then return to menu loop |
| Defeat | `audio/defeat-stinger` then silence | Stinger plays; music stops |

The tavern ambience uses Howler's `rate` and `volume` to layer on top of the base
gameplay loop rather than replacing it — this preserves the seamless music continuity
that the conversation's "procedural audio" sessions aimed for.

## Volume Defaults

| Bus | Default volume |
|---|---|
| sfx | 0.7 |
| music | 0.5 |
| ambient | 0.4 |
| ui | 0.5 |

Volume levels are persisted to `@capacitor/preferences` under keys `vol-sfx`,
`vol-music`, `vol-ambient`, `vol-ui`. The global mute state is persisted under `muted`.
See `95-persistence.md`.

## Mute Toggle

The HUD "🔊 Audio ON" button (source: poc2.html line 277) toggles global mute.
When muted, all four buses are suspended via `Howler.mute(true)`. The button label
changes to "🔇 Audio OFF". State is persisted to preferences so it survives reload.

## Audio Initialization

Audio requires a user gesture to start on mobile and modern browsers. The game begins
audio on the "Enter Realm" button click. All Howler instances are created at this point.
The launcher itself is silent.
