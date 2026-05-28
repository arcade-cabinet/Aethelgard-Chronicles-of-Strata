/**
 * config/narrative — the narrative + flavor domain bundle
 * (M_V13.DECOMP.CONFIG-NARRATIVE).
 *
 * Myth-event flavor (myth-events.json + accessor), the credits roster
 * (credits.json + accessor), and the campaign chapter definitions
 * (campaign-chapters.ts). match-narrative.json + achievements.json are
 * bare data files consumed by deep import (@/config/narrative/*.json),
 * so they have no accessor to re-export.
 */
export * from './myth-events';
export * from './credits';
export * from './campaign-chapters';
