---
title: KayKit Adventurers 2.0 EXTRA — roster audit vs UNIT_PROFILES
updated: 2026-05-23
status: current
domain: technical
---

# KayKit roster audit (M_EXPANSION.A.25)

The bundled `references/KayKit_Adventurers_2.0_EXTRA/Characters/gltf/`
ships 9 characters using the shared Rig_Medium (8 characters) + Rig_Large
(1 character, Barbarian_Large) animation libraries. Today UNIT_PROFILES
defines 4 unit types; 5–7 KayKit characters are **not yet ingested**.

| KayKit character    | Rig        | Currently wired? | UNIT_PROFILES row | Suggested role |
|---------------------|------------|------------------|-------------------|----------------|
| Knight              | Rig_Medium | ✅ wired         | Footman           | (existing)     |
| Mage                | Rig_Medium | ❌ unwired       | —                 | Wizard (magic damage, ranged, expensive) |
| Druid               | Rig_Medium | ❌ unwired       | —                 | Healer (heals adjacent friendly units; civilian) |
| Rogue               | Rig_Medium | ❌ unwired       | —                 | Scout (high vision radius, low HP, no attack) |
| Rogue_Hooded        | Rig_Medium | ❌ unwired       | —                 | Reskin of Rogue (faction palette swap) |
| Ranger              | Rig_Medium | ❌ unwired       | —                 | Archer (ranged normal damage, mid HP) |
| Engineer            | Rig_Medium | ❌ unwired       | —                 | Builder (auto-completes nearby buildings 2× faster) |
| Barbarian           | Rig_Large  | ❌ unwired       | —                 | Berserker (high HP, high melee dmg, slow) |
| Barbarian_Large     | Rig_Large  | ❌ unwired       | —                 | Champion (boss-tier; spawned by Wonder) |

## Implementation notes

- Wiring a KayKit character into UNIT_PROFILES is ONE row + a stat block in
  `config/combat.json` + a logical-id registration in
  `src/config/asset-metadata.json` + a row in `SKINS[faction].rig.character`.
  No code change in the factory — the slot reads cover it.
- M_EXPANSION.A.26 (Mage as Wizard) lands in a follow-up commit; the audit
  here gives the full roadmap so subsequent unit ingests don't re-derive it.
- Rig_Large attachments (Barbarian) reuse the existing Rig_Large_General +
  Rig_Large_MovementBasic animation libraries — already verified in
  `src/entities/rig.ts` rig-tier resolution.

## Open follow-ups (covered by M_EXPANSION.A.26–.A.29)

- A.26 Wizard (Mage)
- A.27 Scout (Rogue)
- A.28 Engineer + Barbarian as attachment-point variants
- A.29 Faction-palette tinting (cosmetic)
