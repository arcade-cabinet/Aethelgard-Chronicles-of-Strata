---
title: Migration log
updated: 2026-05-23
status: current
domain: context
---

# Breaking-change migration log

Append-only ledger of every breaking change to user-facing wire
formats (snapshot schema, Preferences keys, replay format,
URL-shareable seed shape). Each entry includes:

- **Version** that introduced the break
- **What changed** + **migration code** site (if any)
- **Migration test fixture** path (if any)

This log informs save-format migrations + replay-format
compatibility for the lifetime of the project.

## v0.1 → v0.2

- (none) — pre-v0.2 dev builds; no public release.

## v0.2 → v0.3

- (none) — internal milestone, no shipped users.

## v0.3 → v0.4 (in-flight)

- (none yet) — snapshot version stays at 1; SNAPSHOT_MIGRATIONS is
  empty. The framework is in place (`src/persistence/serialize-game.ts`
  §SNAPSHOT_MIGRATIONS) for the next bump.

## Future: v0.4 → v0.5 (when Mana lands)

- SNAPSHOT_VERSION 1 → 2 — adds `GameEconomy.mana: number` (default 0).
  Migration: `(snap) => ({ ...snap, version: 2, economy: { player: {
  ...snap.economy.player, mana: 0 }, enemy: { ...snap.economy.enemy,
  mana: 0 }}})`
- Test fixture: `tests/fixtures/snapshot-v1.json` deserializes to
  v2 economy with mana=0.
- See `docs/specs/107-mana-resource.md` for the full design + migration
  steps.

## Categories tracked here

- **Snapshot schema** (`SNAPSHOT_VERSION`)
- **Preferences keys** (`PREF_KEYS` in persistence.ts) — adding is
  safe; removing or renaming is a break.
- **Replay format** (when M_EXPANSION.F.74 lands)
- **Seed-phrase grammar** (currently `[a-z0-9-]{1,256}` per
  M_EXPANSION.F.82). Narrowing is a break.

## Operational

Every breaking change → one PR that lands the migration code +
appends an entry here in the SAME commit. If a migration ships
without a log entry, that's a process bug — flag it in the next
audit.
