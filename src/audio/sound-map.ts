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
  | 'combat-crit'
  | 'harvest-chop'
  | 'harvest-mine'
  | 'footstep-grass'
  | 'footstep-stone'
  | 'footstep-sand'
  | 'projectile-fire'
  | 'projectile-impact'
  | 'magic-cast'
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

/** A resolved bus + asset id pair for a sound event. */
export interface SoundMapping {
  bus: keyof AudioBuses;
  soundId: string;
}

/** Maps every `GameAudioEvent` to the bus and asset id that plays it. */
export const SOUND_FOR_EVENT: Record<GameAudioEvent, SoundMapping> = {
  // Combat
  'combat-hit': { bus: 'sfx', soundId: 'audio.sfx.hit' },
  'combat-crit': { bus: 'sfx', soundId: 'audio.sfx.magic-impact' },
  'projectile-fire': { bus: 'sfx', soundId: 'audio.sfx.hit' },
  'projectile-impact': { bus: 'sfx', soundId: 'audio.sfx.magic-impact' },
  // M_EXPANSION.AU.44 — wizard spell-cast SFX (PixelLoops Fantasy
  // Magic). Wired in projectile-spawn when the projectile's
  // damageType is 'magic' (see ProjectileLayer / combat path).
  'magic-cast': { bus: 'sfx', soundId: 'audio.sfx.magic-cast' },

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
  'ui-button-click': { bus: 'ui', soundId: 'audio.sfx.ui-click' },
  'ui-panel-open': { bus: 'ui', soundId: 'audio.sfx.ui-panel-open' },
  // M_EXPANSION.AU.34 — purchased-discovery now uses the dedicated
  // PixelLoops 'Unlock_04' chime (was a generic ui-unlock placeholder).
  'research-purchased': { bus: 'ui', soundId: 'audio.ui.discovery-unlock' },

  // Critical-state alarms + outcome stingers
  'critical-alarm': { bus: 'ui', soundId: 'audio.sfx.ui-confirm' },
  victory: { bus: 'music', soundId: 'audio.stinger.victory' },
  defeat: { bus: 'sfx', soundId: 'audio.stinger.defeat' },
};
