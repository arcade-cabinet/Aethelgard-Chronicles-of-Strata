/**
 * M_EXPANSION.U.114 — visible captions / subtitles for sound events.
 *
 * Sits ALONGSIDE the aria-live bus (which speaks to screen readers).
 * Captions render a 2-line subtitle band at the bottom of the screen,
 * coalescing rapid-fire events so a stream of combat hits doesn't
 * flood the band. Toggled in SettingsModal; default off (most players
 * don't need it — deaf players + situational mute users + recording-
 * for-streaming users all do).
 *
 * Caption SOURCES: the sound-map's GameAudioEvent set. Each event gets
 * one short caption (≤ 28 chars) — long enough to read in a glance,
 * short enough not to crowd the gameplay region.
 *
 * Captions for non-audio events (raid started, weather changed, etc)
 * already flow through the aria-live bus; consider those a separate
 * future expansion if the captions toggle should also display them
 * visibly.
 */
import type { GameAudioEvent } from '@/audio/sound-map';

/** Short visible string for each GameAudioEvent. Keep ≤ 28 chars. */
export const CAPTIONS_FOR_EVENT: Record<GameAudioEvent, string> = {
  'combat-hit': '⚔ Hit',
  'combat-hit-siege': '💥 Siege impact',
  'combat-hit-magic': '✨ Spell strikes',
  'combat-hit-melee': '⚔ Sword clash',
  'combat-parry': '🛡 Parried',
  'combat-crit': '⚔ Critical hit',
  'harvest-chop': '🪓 Tree chopped',
  'harvest-mine': '⛏ Stone mined',
  'footstep-grass': '', // ambient noise, no caption
  'footstep-stone': '',
  'footstep-sand': '',
  'projectile-fire': '🏹 Projectile loosed',
  'projectile-impact': '🏹 Projectile lands',
  'magic-cast': '✨ Spell cast',
  achievement: '🏆 Achievement unlocked',
  'ui-error': '⚠ Action refused',
  'unit-death-normal': '💀 Unit slain',
  'unit-death-magic': '💀 Unit disintegrated',
  'unit-death-siege': '💀 Unit shattered',
  'resource-deposit': '📦 Resource stored',
  'unit-select': '', // very frequent, no caption
  'unit-trained': '🎓 Unit ready',
  'building-placed': '🏗 Foundation laid',
  'building-completed': '🏛 Building complete',
  'building-destroyed': '💥 Building lost',
  'gate-open': '🚪 Gate opens',
  'gate-close': '🚪 Gate closes',
  'critical-alarm': '🚨 Base under attack!',
  'ui-button-click': '',
  'ui-panel-open': '',
  'research-purchased': '📜 Research complete',
  victory: '🎉 Victory!',
  defeat: '💀 Defeat',
  // M_V8.PORTAL-STONE.AUDIO
  'portal-stones-placed': '🌀 Portal stones appear',
};

/** A single live caption entry. */
export interface Caption {
  /** Unique id (increments per push). */
  id: number;
  /** Caption text. */
  text: string;
  /** Performance timestamp at which the caption should expire. */
  expiresAt: number;
}

/** How long a caption stays visible after the last push. */
const CAPTION_TTL_MS = 2200;
/** Max captions onscreen at once (FIFO). */
const CAPTION_MAX = 3;

let captionsEnabled = false;
let liveCaptions: Caption[] = [];
let nextId = 1;
const listeners = new Set<(captions: ReadonlyArray<Caption>) => void>();

/** Is captioning currently on? */
export function isCaptionsEnabled(): boolean {
  return captionsEnabled;
}

/** Toggle captioning. */
export function setCaptionsEnabled(value: boolean): void {
  if (captionsEnabled === value) return;
  captionsEnabled = value;
  if (!value) {
    liveCaptions = [];
    for (const cb of listeners) cb(liveCaptions);
  }
}

/**
 * Push a caption for `event`. No-op when captioning is off, when the
 * caption string is empty (filtered events like footsteps + button
 * clicks), or when the same caption was pushed within the last 200ms
 * (rapid-fire combat events coalesce).
 */
const RAPID_FIRE_WINDOW_MS = 200;
export function pushCaptionForEvent(event: GameAudioEvent, nowMs?: number): void {
  if (!captionsEnabled) return;
  const text = CAPTIONS_FOR_EVENT[event];
  if (!text) return;
  const now = nowMs ?? performance.now();
  const recent = liveCaptions[liveCaptions.length - 1];
  if (
    recent &&
    recent.text === text &&
    now - (recent.expiresAt - CAPTION_TTL_MS) < RAPID_FIRE_WINDOW_MS
  ) {
    // refresh TTL on the existing entry instead of stacking duplicates
    recent.expiresAt = now + CAPTION_TTL_MS;
  } else {
    liveCaptions.push({ id: nextId++, text, expiresAt: now + CAPTION_TTL_MS });
    if (liveCaptions.length > CAPTION_MAX) liveCaptions.shift();
  }
  for (const cb of listeners) cb(liveCaptions);
}

/** Snapshot of currently-live captions (not expired). Called by the renderer. */
export function getLiveCaptions(nowMs?: number): ReadonlyArray<Caption> {
  const now = nowMs ?? performance.now();
  const alive = liveCaptions.filter((c) => c.expiresAt > now);
  if (alive.length !== liveCaptions.length) {
    liveCaptions = alive;
    for (const cb of listeners) cb(liveCaptions);
  }
  return liveCaptions;
}

/** Subscribe to caption list changes. Returns unsubscribe. */
export function subscribeCaptions(cb: (captions: ReadonlyArray<Caption>) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Test hook — reset state between tests. */
export function _resetCaptionsForTests(): void {
  captionsEnabled = false;
  liveCaptions = [];
  nextId = 1;
  listeners.clear();
}
