/**
 * Event → sound map.
 *
 * Enumerates every game audio event and maps each to the bus + asset id that
 * should play when the event fires.
 *
 * Source: docs/specs/80-audio.md §Event → Sound Map
 */
import type { AudioBuses } from './buses';

/** All named game audio events. */
export type GameAudioEvent =
  | 'combat-hit'
  | 'combat-hit-siege'
  | 'combat-hit-magic'
  | 'combat-crit'
  | 'harvest-chop'
  | 'harvest-mine'
  | 'footstep-grass'
  | 'footstep-stone'
  | 'footstep-sand'
  | 'projectile-fire'
  | 'projectile-impact'
  | 'magic-cast'
  | 'achievement'
  | 'ui-error'
  | 'resource-deposit'
  | 'unit-select'
  | 'unit-trained'
  | 'building-placed'
  | 'building-completed'
  | 'building-destroyed'
  | 'gate-open'
  | 'gate-close'
  | 'critical-alarm'
  | 'ui-button-click'
  | 'ui-panel-open'
  | 'research-purchased'
  | 'victory'
  | 'defeat';

/** A resolved bus + asset id pair for a sound event.
 * M_EXPANSION.AU.35 — `soundIds` (plural) declares a variant pool;
 * the emitter picks one at play time. Use `soundId` (singular) for
 * the legacy single-asset shape — both are accepted. */
export interface SoundMapping {
  bus: keyof AudioBuses;
  soundId?: string;
  /** Variant pool — the emitter rotates among these per call. */
  soundIds?: readonly string[];
}

/**
 * Resolve a sound mapping to one concrete asset id. Picks a random
 * variant from `soundIds` if present; otherwise returns `soundId`.
 * Returns the asset id (never undefined — mappings always have one or
 * the other). The "random" pick uses Math.random because this is pure
 * presentation outside the determinism scope (sim ≠ UI sound).
 */
export function resolveSoundId(mapping: SoundMapping): string {
  if (mapping.soundIds && mapping.soundIds.length > 0) {
    const idx = Math.floor(Math.random() * mapping.soundIds.length);
    return mapping.soundIds[idx] ?? mapping.soundIds[0] ?? '';
  }
  return mapping.soundId ?? '';
}

/** Maps every `GameAudioEvent` to the bus and asset id that plays it. */
export const SOUND_FOR_EVENT: Record<GameAudioEvent, SoundMapping> = {
  // Combat (M_EXPANSION.AU.45 — split per damageType so a sword
  // landing on a wall sounds different from an arrow on a peon).
  'combat-hit': { bus: 'sfx', soundId: 'audio.sfx.hit' },
  'combat-hit-siege': { bus: 'sfx', soundId: 'audio.sfx.hit-stone' },
  'combat-hit-magic': { bus: 'sfx', soundId: 'audio.sfx.magic-impact' },
  'combat-crit': { bus: 'sfx', soundId: 'audio.sfx.hit-metal' },
  'projectile-fire': { bus: 'sfx', soundId: 'audio.sfx.hit' },
  'projectile-impact': { bus: 'sfx', soundId: 'audio.sfx.magic-impact' },
  // M_EXPANSION.AU.44 — wizard spell-cast SFX (PixelLoops Fantasy
  // Magic). Wired in projectile-spawn when the projectile's
  // damageType is 'magic' (see ProjectileLayer / combat path).
  'magic-cast': { bus: 'sfx', soundId: 'audio.sfx.magic-cast' },
  // M_EXPANSION.AU.33 — generic achievement chime (PixelLoops UI
  // achievement). Fires today on first zone claim; later milestones
  // (first kill, first wonder build) reuse the same event.
  achievement: { bus: 'ui', soundId: 'audio.ui.achievement' },
  // M_EXPANSION.AU.36 — failure chime for blocked actions (can't
  // afford, prereq missing, supply at cap). Fires from HudButton's
  // disabled-onClick handler.
  'ui-error': { bus: 'ui', soundId: 'audio.ui.error' },

  // World interaction
  'harvest-chop': { bus: 'sfx', soundId: 'audio.sfx.chop' },
  'harvest-mine': { bus: 'sfx', soundId: 'audio.sfx.mine' },
  'footstep-grass': { bus: 'sfx', soundId: 'audio.sfx.footstep-grass' },
  'footstep-stone': { bus: 'sfx', soundId: 'audio.sfx.footstep-stone' },
  // M_EXPANSION.AU.43 — sand surface (desert biome). Falls back to
  // grass if a biome is uncategorised.
  'footstep-sand': { bus: 'sfx', soundId: 'audio.sfx.footstep-sand' },
  'resource-deposit': { bus: 'sfx', soundId: 'audio.sfx.deposit' },

  // Selection / building
  'unit-select': { bus: 'ui', soundId: 'audio.sfx.select' },
  'unit-trained': { bus: 'sfx', soundId: 'audio.sfx.ui-confirm' },
  'building-placed': { bus: 'sfx', soundId: 'audio.sfx.build' },
  // M_EXPANSION.AU.32 — completed-build now uses the PixelLoops
  // 'Notification_03' chime so an off-screen completion gets a
  // satisfying audible signal (was a generic ui-achievement).
  'building-completed': { bus: 'sfx', soundId: 'audio.ui.research-complete' },
  'building-destroyed': { bus: 'sfx', soundId: 'audio.stinger.defeat' },
  'gate-open': { bus: 'sfx', soundId: 'audio.sfx.ui-panel-open' },
  'gate-close': { bus: 'sfx', soundId: 'audio.sfx.ui-confirm' },

  // UI
  // M_EXPANSION.AU.35 — variant pool so repeated clicks don't sound
  // robotic. The emitter rotates among these per call.
  'ui-button-click': {
    bus: 'ui',
    soundIds: ['audio.ui.click-01', 'audio.ui.click-02', 'audio.ui.click-03'],
  },
  'ui-panel-open': { bus: 'ui', soundId: 'audio.sfx.ui-panel-open' },
  // M_EXPANSION.AU.34 — purchased-discovery now uses the dedicated
  // PixelLoops 'Unlock_04' chime (was a generic ui-unlock placeholder).
  'research-purchased': { bus: 'ui', soundId: 'audio.ui.discovery-unlock' },

  // Critical-state alarms + outcome stingers
  'critical-alarm': { bus: 'ui', soundId: 'audio.sfx.ui-confirm' },
  victory: { bus: 'music', soundId: 'audio.stinger.victory' },
  defeat: { bus: 'sfx', soundId: 'audio.stinger.defeat' },
};
