---
title: MYTH events — in-fiction companion to the JSON registry
updated: 2026-05-25
status: current
domain: creative
---

# MYTH Events — What the Strata Are Saying

The MYTH event registry (`src/config/myth-events.json`) drives the
random-event subsystem. Each event has a mechanical effect spelled
out in the JSON's `flavorText` field. This document expands on each
event's *in-fiction meaning* — why the strata produce it, how the
factions interpret it, what hooks the marketing prompts and the
chronicler's voice should reach for.

Adding a 6th event = an entry in the JSON + one switch arm in
`src/game/myth-events.ts` + an entry here.

## solar-eclipse

**JSON flavour:** "The sun darkens. Every faction's vision range
halves for 60 seconds."

**What it is in fiction.** The **Glacial Stratum** pulses upward
and briefly suppresses the strata-resonance the Watchtowers use to
see by. The sky doesn't literally darken — the *strata* darken, and
because the towers read the strata, they go half-blind. Peons can
still see what's in front of them; the army loses its
extra-perceptual reach.

**Faction interpretation:**
- *Medieval*: "the Glacial reproves us — pull back the patrols."
- *Orc*: "raid window, they can't see us coming."
- *Undead*: "the Glacial is awake — march."
- *Mystic*: "the answer is approaching. Listen, do not move."

**Chronicler's voice:** "The 7th day of the year was given to the
Glacial; we set no torches that night, save where the Mythics
permitted."

## meteor-strike

**JSON flavour:** "A meteor crashes! A random tile burns + everything
on it takes 30 damage."

**What it is in fiction.** **Mythic-Stratum debris falling back to
the surface.** The Mythic Stratum is the highest layer — it is not
strictly *attached* to the rest of the strata column, and fragments
of it occasionally detach and re-enter from above. They strike like
meteors because they essentially are meteors made of stratified
god-residue.

**Faction interpretation:**
- *Medieval*: investigate the impact site, sometimes recover a
  charter-fragment.
- *Orc*: the Ember was insulted by something — find out what.
- *Undead*: a memorial reset — the strike will be sealed in time.
- *Mystic*: priceless. The impact crater becomes a sanctuary candidate
  the moment it cools.

**Chronicler's voice:** "A piece of the sky fell on the Pass; we
named the new ridge after it."

## wildlife-migration

**JSON flavour:** "A neutral herd crosses the map. Clear it for
+20 food."

**What it is in fiction.** Migrating herds of strata-resonant fauna
(antlered, bioluminescent, traditionally hex-walking). They appear
only when the **Verdant Stratum** is unusually well-fed — which
happens when no faction has razed any forest tile in the past 5
minutes. Clearing the herd is a peon job (yes, peons *fight* the
herd; they sing it down rather than kill it).

**Faction interpretation:**
- *Medieval*: harvest in good faith. The chronicle records the
  herd's path year-by-year.
- *Orc*: harvest greedily. The herd's bones make good forge stock.
- *Undead*: ignore. The herd is alive.
- *Mystic*: harvest only the strays. The herd as a whole is a
  signal that the realm is healthy.

**Chronicler's voice:** "The Verdant sent its herd through our
march that year; we ate from its blessing and named the firstborn
calf after the Stratum."

## oracle-vision

**JSON flavour:** "A random faction glimpses another faction's base
— a single-tile reveal."

**What it is in fiction.** **The Mythic Stratum's last sentence
reaches a listener.** A scholar in any faction (chosen at random
by the strata, not the player) briefly *hears* the resonance of a
distant keep. The reveal is a single tile because that's the
resolution of the hearing — the listener can locate the keep on the
hex-grid but not its interior.

**Faction interpretation:**
- *Medieval*: cartographic gift, file under "augury".
- *Orc*: target acquired.
- *Undead*: confirmed disturbance. Plan reseal.
- *Mystic*: the strata are speaking; record it precisely.

**Chronicler's voice:** "The Mythic spoke to one of our scribes
that dawn; she drew a single hex on the map and would not say more."

## harvest-festival

**JSON flavour:** "Every faction gains +50 food + +20 gold from the
festival markets."

**What it is in fiction.** **The Verdant Stratum blooms in concert
across the realm.** It is the only MYTH event that affects every
faction equally — the strata don't pick sides during a bloom. The
festival is the surface response: markets open in every keep, peons
take a day off the chant, and the eras' rivalries pause for one
inclusive feast.

**Faction interpretation:**
- *Medieval*: the chronicle's favourite day of the year.
- *Orc*: a truce day — to drink, not to think.
- *Undead*: the dead remember the festival. They stand still that
  day; some say they sway.
- *Mystic*: the Verdant Stratum is saying *yes*. Everyone listen.

**Chronicler's voice:** "The Verdant said yes; the realm ate its
fill; the war waited a day."

---

## Cross-references

- JSON registry: `src/config/myth-events.json` (canonical mechanical
  definitions — `displayName`, `flavorText`, `durationSeconds`,
  `weight`).
- Runtime dispatcher: `src/game/myth-events.ts` (switch arms per
  `kind`).
- Strata canon: `docs/lore/00-canon.md` § II (the eras) + § V (the
  MYTH events).
- Per-faction interpretation language: `docs/lore/factions/*.md`
  (each archetype's "MYTH event reactions" section is the source of
  truth for the table rows above).
