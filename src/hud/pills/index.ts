/**
 * `@/hud/pills` — top-center / edge HUD pill barrel.
 *
 * M_V13.DECOMP.HUD-PILLS — the small fixed-position status pills.
 * Several compete for the top-center column; the staggering is
 * documented in their per-file comments and will move to a shared
 * hud/theme/hud-layout.ts slot helper in §B FIX-PILL-COLLISION.
 */
export { ScoreBar } from './ScoreBar';
export { FactionChips, describeFactionChips } from './FactionChips';
export { WinConditionPill } from './WinConditionPill';
export { MatchAgePill } from './MatchAgePill';
export { RaidPressurePill } from './RaidPressurePill';
export { ZoneControlPill } from './ZoneControlPill';
export { NonAggressionPactPill } from './NonAggressionPactPill';
export { MobileSpeedPausePill } from './MobileSpeedPausePill';
export { ZoneFlipPulse } from './ZoneFlipPulse';
export { WeatherIndicator } from './WeatherIndicator';
