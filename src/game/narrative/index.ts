/**
 * game/narrative — match flavor + event + scoring systems
 * (M_DECOMP-ECS-GAME phase 2): match-narrative (highlights/nicknames),
 * narrator-beats (inactivity/proximity toasts), myth-events (the
 * world-event director), random-events (long-reign escalation + random
 * event ticker), daily-challenge (seed + score), achievements.
 */
export {
  type MatchHighlight,
  detectTranscriptHighlights,
  matchNickname,
  matchHighlights,
} from './match-narrative';
export { tickInactivityBeats, tickEnemyAtPalaceToast } from './narrator-beats';
export {
  type MythEventsState,
  createMythEventsState,
  canFireMythEvent,
  pickMythEvent,
  fireMythEvent,
  applyHarvestFestival,
  type MeteorStrikeInput,
  applyMeteorStrike,
  eclipseVisionMultiplier,
  pickMigrationTile,
  applyMigrationReward,
  type OracleVisionResult,
  pickOracleVision,
} from './myth-events';
export {
  type RandomEventKind,
  type RandomEventsState,
  createRandomEventsState,
  tickLongReignEscalation,
  tickRandomEvents,
} from './random-events';
export {
  todayUTC,
  hashStringFnv1a,
  dailyChallengeSeedFor,
  todaysDailyChallengeSeed,
  type DailyChallengeScore,
} from './daily-challenge';
export {
  type AchievementDef,
  ACHIEVEMENTS,
  readUnlockedAchievements,
  unlockAchievement,
} from './achievements';
