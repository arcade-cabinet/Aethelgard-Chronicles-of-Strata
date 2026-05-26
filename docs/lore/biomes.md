---
title: The Biomes — In-Fiction Companion to the Hex Palette
updated: 2026-05-25
status: current
domain: creative
---

# The Biomes of Aethelgard

Every tile biome in Aethelgard is a surface expression of the strata
beneath. The colour of the tile is the colour of the closest stratum
breaching that hex — and the mechanical effect of the biome (movement
cost, resource yield, build restrictions) is downstream of which
stratum is talking.

Use this companion when authoring tile narrative, MYTH-event flavour
text, or marketing screenshots — the biomes have voices.

## GRASS

**Surface of the Verdant Stratum.** The most common biome in the
realm. Grass-tiles are *patient* — they regrow what's harvested, hold
banners well, accept walls with no resistance. The Chronicler-King
who can hold three grass-tiles in a row is said to *speak to the
Verdant*.

- **Lore-tone:** quiet, agricultural, generative.
- **MYTH event hooks:** harvest festivals (Verdant blooming);
  drought (Verdant withdrawing — usually a sign that the realm is
  taking too much).

## FOREST

**Verdant Stratum with depth.** Forests are grass-tiles where the
Verdant has *concentrated* — taller, denser, slower. Peons love
forests (wood harvest); footmen hate them (line-of-sight is
fragmented). The oldest forests carry a tradition that they
remember which realms have respected their canopy.

- **Lore-tone:** crowded, intimate, slow.
- **MYTH event hooks:** wildfire (Ember venting through the Verdant —
  forest tiles burn well); regrowth (the forest erasing a forgotten
  road).

## HIGHLAND

**Surface of the Verdant–Ember boundary.** The geology is buckled
here — green grass over warm stone, treelines that fail at a sharp
contour. Highland tiles produce stone and host the early-game orc
clans; the heat is enough to forge but not enough to scorch.

- **Lore-tone:** windy, contested, the seam between two strata.
- **MYTH event hooks:** rockslides, mineral discoveries, the first
  orc raids of a frontier-raid match.

## MOUNTAIN

**Ember Stratum breaches.** When the Ember vents through to the
surface, the result is a faceted mountain. Movement is murderous;
strata-resonance is loud. Watchtowers on a mountain tile see further
because the strata sing louder.

- **Lore-tone:** monumental, dangerous, sacred to orcs.
- **MYTH event hooks:** volcanic eruptions, frostbite, ember-storms.

## MOUNTAIN_PASS

**A surveyed passage through an Ember-breached column.** The medieval
charter realms cut these passes; the orcs use them. A pass tile is
always a contested corridor; matches on continent maps live and die
on who holds the pass.

- **Lore-tone:** chokepoint, named historically (every pass has a
  Chronicler-named treaty after it).
- **MYTH event hooks:** ambushes (the strata amplify sound through
  the cut); avalanches.

## BEACH

**Where the strata meet the luminescent sea.** Beach tiles are
*tide-edge* — the Glacial Stratum's coldest fringe meets surface
water and produces a band of warm pale sand. Naval lore is thin in
Aethelgard (the sea is too clear and too shallow for galleys) but
beaches are the landing point for raids and the burial ground for
peace pacts.

- **Lore-tone:** liminal, pale, gentle.
- **MYTH event hooks:** storm tides, beached relics (lost charter
  documents wash up).

## OCEAN

**The luminescent sea itself.** Ocean tiles are uncrossable for
ground units. The water glows faintly because the Glacial Stratum
extends *under* the sea floor and the cold-magic refracts upward.
The Mystic scholars believe the ocean's pulse is a map.

- **Lore-tone:** vast, calm, knowable only by the Mystics.
- **MYTH event hooks:** sea-mist that fogs adjacent land tiles for
  N seconds; an "answering pulse" event when a Mystic faction
  Wonders near coastline.

## DESERT

**Above the Glacial Stratum's deepest run.** Counter-intuitively, the
hottest surface biome sits over the coldest stratum: the Glacial layer
*pulls heat upward* to maintain its own balance. The result is a
shimmering, mirage-prone landscape. Peons struggle; revenants prefer
it.

- **Lore-tone:** harsh, mirroring, undead-favoured.
- **MYTH event hooks:** mirages (false enemy sightings), sand-rite
  (Glacial pulse causing every desert tile to glow once per match).

## SWAMP

**Where Verdant decay meets standing Glacial chill.** Swamps are
slow-movement, high-yield-wood, and *dense with strata-voice*. They
host more MYTH events per tile than any other biome.

- **Lore-tone:** murky, listening, never quite quiet.
- **MYTH event hooks:** marsh-lights (Mythic Stratum bleed-through),
  unit submersion (a unit lost in a swamp returns 30s later or
  doesn't).

## RUINS

**A tile where a Wonder once stood and is no longer maintained.**
Ruins are categorically *the Mythic Stratum's memory of a forgotten
covenant*. They produce strange resource yields and host unaffiliated
revenants. The Mystics will go to war to protect ruins from being
built on.

- **Lore-tone:** echoing, partial, a half-remembered sentence.
- **MYTH event hooks:** Wonder-echo events that briefly grant a
  discovery from the dead realm's tech tree; revenant uprisings.

## VOLCANO

**An Ember Stratum vent that hasn't been bound.** The orc clans seek
to bind them (turning a volcano into a forge); other realms seek to
seal them. A live volcano produces wildfires and tile damage on
periodic cadence — the Ember layer venting raw.

- **Lore-tone:** living, dangerous, contested.
- **MYTH event hooks:** the existing volcano + wildfire event chain
  in the JSON registry.

## LAVA

**A tile mid-eruption from a nearby volcano.** Lava tiles are
temporarily impassable + damaging to adjacent units. Mostly an
event-time biome rather than a generation-time biome.

- **Lore-tone:** ephemeral, violent.
- **MYTH event hooks:** *is* the event — lava tiles are the
  visualisation of an active Ember vent.

## QUICKSAND

**A Glacial Stratum slump.** When the cold layer subsides under a
desert or beach tile, the surface becomes a trap. Quicksand tiles
are passable but slow + occasionally swallow a unit (the unit returns
in 60s, or doesn't, depending on the strata's mood).

- **Lore-tone:** treacherous, slow-motion, a Glacial joke.
- **MYTH event hooks:** swallow events, the rare unit re-appearance
  in a distant quicksand tile (Mythic Stratum re-routing).

---

## Cross-references

- Tile palette: `src/world/biome-palette.ts` — colour tokens that
  visualise these biomes.
- Decoration scatter: `src/world/Decoration.tsx` — props per biome
  (rocks, stumps, palms) should match the lore-tone (gentle for
  grass, monumental for mountain).
- MYTH-event JSON: `src/world/myth-events.json` (canonical registry).
  M_LORE.3 expands per-event in-fiction reasoning.
