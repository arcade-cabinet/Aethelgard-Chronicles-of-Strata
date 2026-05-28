/**
 * config/progression — the progression domain bundle
 * (M_V13.DECOMP.CONFIG-PROGRESSION).
 *
 * In-match discoveries (discoveries.json + accessor) and cross-run
 * meta-unlocks (meta-unlocks.json + accessor). eras.json lives here as
 * bare era-tuning data; its Zod loader is src/rules/eras.ts, which
 * imports the JSON by deep path (@/config/progression/eras.json), so
 * there is no accessor to re-export.
 */
export * from './discoveries';
export * from './meta-unlocks';
