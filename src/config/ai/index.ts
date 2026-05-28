/**
 * config/ai — the faction + AI domain bundle (M_V13.DECOMP.CONFIG-AI).
 *
 * The faction registry (factions.ts: ids, kinds, archetypes,
 * buildDefaultFactions), the faction color palette (faction-palette.ts:
 * default colors, hex normalization), and the AI personality table
 * (ai-personalities.json + accessor: per-personality evaluator weights).
 * Grouped because factions + their palette + the AI brains that drive
 * non-player factions are one conceptual domain.
 */
export * from './factions';
export * from './faction-palette';
export * from './ai-personalities';
