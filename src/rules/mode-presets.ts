import type { GameMode } from '@/game/game-state';

/**
 * Mode preset axes (M_MODES.7) — the 4 customisation knobs a `GameMode`
 * expands into. Each preset is the recommended starting point; an
 * "Advanced" NewGameModal toggle lets a player override individual axes.
 *
 * - mapSize: default board radius (player can still pick small/med/large/huge).
 * - matchLength: target match duration cohort. Drives spawn-interval scaling +
 *   escalation thresholds; 'endless' literally never ends until resign/starve.
 * - turnsMode: 'real-time' (default) | 'turn-based' (M_MODES.8 superposition).
 * - mapType: which guided-generation rule set runs (M_MODES.9 — balanced =
 *   M_MAPGEN.3-.9 today; continent/archipelago/dry-land each swap in
 *   different paint passes when their items land).
 * - guidedMapGen: master switch — when false, paint passes are skipped
 *   (skirmish mode preserves the v0.3 pure-noise behavior).
 * - invulnerableBases: M_MODES.4 endless mode — TownHalls take 0 damage.
 */
export type MatchLength = 'short' | 'medium' | 'long' | 'endless';
export type TurnsMode = 'real-time' | 'turn-based';
export type MapType = 'balanced' | 'continent' | 'archipelago' | 'dry-land';

export interface ModePreset {
  /** Default board radius for this mode (one of the MAP_SIZES tiers). */
  mapSize: 'small' | 'medium' | 'large' | 'huge';
  matchLength: MatchLength;
  turnsMode: TurnsMode;
  mapType: MapType;
  /** When false, skip the guided-generation post-pass (pure noise). */
  guidedMapGen: boolean;
  /** When true, FactionBases take 0 damage (endless mode). */
  invulnerableBases: boolean;
}

/**
 * Per-mode preset defaults. The NewGameModal renders these as preset cards;
 * Advanced reveals the individual axes for override.
 */
export const MODE_PRESETS: Record<GameMode, ModePreset> = {
  'red-vs-blue': {
    mapSize: 'medium',
    matchLength: 'short',
    turnsMode: 'real-time',
    mapType: 'balanced',
    guidedMapGen: true,
    invulnerableBases: false,
  },
  skirmish: {
    mapSize: 'small',
    matchLength: 'short',
    turnsMode: 'real-time',
    mapType: 'balanced',
    guidedMapGen: false,
    invulnerableBases: false,
  },
  endless: {
    mapSize: 'large',
    matchLength: 'endless',
    turnsMode: 'real-time',
    mapType: 'balanced',
    guidedMapGen: true,
    invulnerableBases: true,
  },
  'classic-rts': {
    mapSize: 'large',
    matchLength: 'medium',
    turnsMode: 'real-time',
    mapType: 'continent',
    guidedMapGen: true,
    invulnerableBases: false,
  },
  '4x': {
    mapSize: 'huge',
    matchLength: 'long',
    turnsMode: 'turn-based',
    mapType: 'continent',
    guidedMapGen: true,
    invulnerableBases: false,
  },
};

/** Resolve the preset for a mode; defaults to red-vs-blue for unknown input. */
export function presetFor(mode: GameMode | undefined): ModePreset {
  return MODE_PRESETS[mode ?? 'red-vs-blue'];
}
