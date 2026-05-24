---
title: Mana — the 4th resource slot (M_EXPANSION.F.72 + D.163)
updated: 2026-05-23
status: current
domain: technical
---

# Mana resource (4th slot)

Mana is the fourth harvestable resource alongside wood / stone /
gold / science. It's the gating cost for magical units (Wizard,
future Druid healers) and the energy budget for active-effect
buildings (future Wonder secondary mode, Library magical-research).

## Spawn + harvest

- **Asset:** `nature.crystal-large.glb` (Tower Defense Kit crystal,
  already ingested under M_EXPANSION.A.21).
- **Biomes:** MOUNTAIN, HIGHLAND (rare). Joins `RESOURCE_PROFILES.mana`.
- **Attractor guarantee:** 1 node within ATTRACTOR_RADIUS (so a
  faction that has science-tech access can start working toward
  Mana within the early game).
- **Yield per harvest:** 8 (lower than wood/stone — Mana is precious).
- **Topup amount:** 50 (lower than other resources for the same reason).

## Economy slot

`ResourceType` extends to `'wood' | 'stone' | 'gold' | 'science' | 'mana'`.
`GameEconomy` gains a `mana: number` field; ResourceBar adds a
fifth chip (4 + supply already shipped — slot system handles it).

## Wizard cost migration

Today the Wizard costs `gold 20 + science 25` (M_EXPANSION.A.26).
With Mana shipped, the cost rebalances to `gold 10 + mana 15` —
Wizards become Mana-gated, freeing science for true research
buildings (Library, future Sanctum).

## Migration path

This is a SCHEMA-BUMP change to the save snapshot. When Mana lands:

1. SNAPSHOT_VERSION bumps from 1 → 2.
2. `SNAPSHOT_MIGRATIONS[1] = (snap) => { ...snap, version: 2, economy: {
   ...snap.economy, player: { ...snap.economy.player, mana: 0 }, enemy:
   { ...snap.economy.enemy, mana: 0 } }}`.
3. The v0→v1 migration framework is already in place
   (M_AUDIT2.ARCH.36); this is the first real use.

## Out of scope here

- Spell-casting verbs (Heal / Smite / Teleport) — Wizards today
  fire a magic-damage projectile; spell-cast verbs land under a
  later milestone with active-target picker UX.
- Mana regen rates / max-pool cap — tunable once playtest data lands.
- Faction-tinted Mana crystals (the Tower Defense Kit crystal is
  faction-agnostic today; a tint slot can land later).

## Implementation order

The change ripples through ~14 modules. The recommended order:

1. Spec lands (this file). ← we are here.
2. `RESOURCE_TYPES` + `ResourceType` extension.
3. `RESOURCE_PROFILES.mana` row (mesh / yield / biomes / topup).
4. `GameEconomy.mana: number` + ResourceBar fifth chip.
5. `ECONOMY.resourceSpawn` JSON row + ATTRACTOR_GUARANTEE row.
6. Snapshot migration v1→v2.
7. Wizard cost change + UI tooltip update.
8. Test pass: round-trip, harvest, train.

Each step is one commit with its own reviewer.
