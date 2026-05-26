---
title: Discoveries — in-fiction companion to the research registry
updated: 2026-05-25
status: current
domain: creative
---

# Discoveries — Reading the Strata

The Discovery registry (`src/config/discoveries.json`) is the
research tree. Each row has a mechanical effect (cost, unlock,
prereqs) defined there. This document expands each Discovery's
*in-fiction meaning* — what the realm *learned*, which Stratum
taught it, what the Chronicler's voice says about it. Use these
expansions in DiscoveriesPanel rows (M_HUD.SHELL.17 will surface
them).

A Discovery is not a "tech" in Aethelgard — it is an *answered
question put to the strata*. The realm asks; the strata respond;
the answer becomes a building, a unit, a tactic.

## forgedBlades

**Question asked of the Ember Stratum.** "What is the form of an
edge that holds?" The answer is a Footman's blade with a thin
Ember-vein laminated through the steel — the blade stays sharp by
absorbing the strike's heat back into the strata column under the
forge.

- **In-fiction unlock:** Footmen swing harder.
- **Chronicler's voice:** "The Ember answered with an edge."
- **Archetype affinity:** Orc realms unlock this fast; mystics
  delay it (an Ember answer is a *loud* answer).

## steelPlows

**Question asked of the Verdant Stratum.** "How do we ask the field
for more without breaking it?" The answer is a plow whose share is
Ember-forged steel but whose handle is grown from Verdant-blessed
oak — the strata cooperate in the implement and the field cooperates
with the realm.

- **In-fiction unlock:** Peons harvest food faster from grass + forest.
- **Chronicler's voice:** "We asked the Verdant; it lent us the season."
- **Archetype affinity:** Universal — all realms benefit. Medieval
  realms tend to take it first (the charter recognises the field as
  a citizen).

## trade-route

**Question asked of the strata under a road.** "Will you remember
this path between two keeps?" The answer is a strata-marked road
that resists overgrowth + lets caravans move faster without losing
direction. The strata literally *signpost* the road from below.

- **In-fiction unlock:** Resource flow between owned tiles
  accelerates.
- **Chronicler's voice:** "The strata held the road through the
  winter; the wagons did not stray."
- **Archetype affinity:** Medieval (formal trade) + mystic
  (the road is also a chant). Orcs raid it; undead ignore it.

## cartography

**Question asked of the Mythic Stratum.** "Where am I?" The answer
is *the realm's complete hex-grid revealed in the chronicler's hand
without surveying*. A Mythic-Stratum gift; the realm now sees its
own shape.

- **In-fiction unlock:** Fog-of-war reduction; minimap clarity boost.
- **Chronicler's voice:** "The Mythic showed us the realm whole,
  for one cold afternoon."
- **Archetype affinity:** Mystic favourite. Medieval will take it
  but is uncomfortable with the gift (the charter wants surveys
  earned, not gifted).

## iron-tools

**Question asked of the Highland seam.** "Can the seam between
Verdant and Ember serve us both?" The answer is iron — the seam's
characteristic mineral that respects both layers. Iron-tooled peons
work faster on highland + mountain tiles.

- **In-fiction unlock:** Peon stone-yield boost.
- **Chronicler's voice:** "The seam yielded; we shod our chisels in
  iron, and the mountain was kinder."
- **Archetype affinity:** Orc (forges iron well) + medieval (writes
  iron into the charter). Mystics use stone tools longer; undead
  use frost tools.

## siege-engineering

**Question asked of the strata under a wall.** "Where does this
mortar break?" The answer is a deeply uncomfortable one — every
wall has a *strata-frequency* at which its mortar separates. The
Discovery is the catalogue of those frequencies; the realm builds
siege engines to play them.

- **In-fiction unlock:** Trebuchet + ram units; wall damage boost.
- **Chronicler's voice:** "We asked the wall its name; it answered;
  we wrote the answer on a stone, and the stone broke the wall."
- **Archetype affinity:** Orc (always wants the breaking). Medieval
  + undead REFUSE this Discovery in some campaigns — it breaks the
  charter premise that walls are *rooted*.

## monumental-architecture

**Question asked of every Stratum simultaneously.** "Will you
remember THIS?" The answer, when all strata agree, is a Wonder. A
Wonder is the only structure that the strata maintain after the
realm falls. The chronicle records it; the realm graduates.

- **In-fiction unlock:** Wonder build availability.
- **Chronicler's voice:** "The strata answered as one — *yes,
  remember this*. We laid the cornerstone before sunset."
- **Archetype affinity:** All realms can reach it, but each builds
  a different Wonder shape: medieval = cathedral-keep, orc =
  forge-vent, undead = reseal-cairn, mystic = codex-dome.

---

## Cross-references

- JSON registry: `src/config/discoveries.json` (canonical mechanical
  definitions — id, displayName, description, cost, prereqs).
- DiscoveriesPanel: `src/hud/DiscoveriesPanel.tsx` (M_HUD.SHELL.17
  will surface the in-fiction descriptions alongside the mechanical
  ones).
- Strata canon: `docs/lore/00-canon.md` § I (the 11 strata).
- Faction affinities: each archetype doc in `docs/lore/factions/`
  carries the "preferred research path" hooks that downstream AI
  evaluators will use.
