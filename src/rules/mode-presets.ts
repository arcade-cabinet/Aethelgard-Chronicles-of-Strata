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
  /**
   * M_TURNS.2 — turn cap for turn-based modes. null = uncapped (the
   * match runs until base destruction / resign). Real-time modes also
   * carry this knob for future consistency, but only the turn-based
   * win-loss path consults it today. When game.turnsElapsed reaches
   * maxTurns, the win goes to the faction with higher zone-control +
   * score; tie → draw.
   */
  maxTurns: number | null;
  /**
   * M_PIVOT.MODES.4X — default count of PLAYER factions for this mode.
   * The legacy 2-faction modes (border-clash, frontier-raid, long-reign,
   * strata-wars, coexistence) keep `2`. Age-of-strata (the 4X mode)
   * defaults to `6` — a six-player FFA + 4 barbarian camps. The
   * NewGameModal can override this; barbarian-camp auto-spawn picks
   * up the actual count via game.factions.length.
   */
  defaultPlayerCount: number;
}

/**
 * Per-mode preset defaults. The NewGameModal renders these as preset cards;
 * Advanced reveals the individual axes for override.
 */
export const MODE_PRESETS: Record<GameMode, ModePreset> = {
  // M_FUN.MAP.PER_MODE — each mode gets a mapType matching its
  // mechanical identity from PRD-v0.4 §3 / spec 120 § per-mode
  // design. The mapType drives generator behaviour per the
  // src/config/mapgen.json#mapTypes registry.
  //
  // border-clash → balanced: 1v1 RTS, central funnel choke,
  //   mountain massif divides bases ~equally.
  'border-clash': {
    mapSize: 'medium',
    matchLength: 'short',
    turnsMode: 'real-time',
    mapType: 'balanced',
    guidedMapGen: true,
    invulnerableBases: false,
    maxTurns: null,
    defaultPlayerCount: 2,
  },
  // frontier-raid → dry-land: badlands feel, dense mountain
  //   ridge-lines force multiple short chokes; rush military meta.
  'frontier-raid': {
    mapSize: 'small',
    matchLength: 'short',
    turnsMode: 'real-time',
    mapType: 'dry-land',
    guidedMapGen: true,
    invulnerableBases: false,
    maxTurns: null,
    defaultPlayerCount: 2,
  },
  // long-reign → continent: larger landmass, denser mountains,
  //   multiple redundant chokes — attrition match.
  'long-reign': {
    mapSize: 'large',
    matchLength: 'endless',
    turnsMode: 'real-time',
    mapType: 'continent',
    guidedMapGen: true,
    invulnerableBases: true,
    maxTurns: null,
    defaultPlayerCount: 2,
  },
  // strata-wars → continent: layered chokes around central
  //   contested zone; longer match.
  'strata-wars': {
    mapSize: 'large',
    matchLength: 'medium',
    turnsMode: 'real-time',
    mapType: 'continent',
    guidedMapGen: true,
    invulnerableBases: false,
    maxTurns: null,
    defaultPlayerCount: 2,
  },
  // age-of-strata → archipelago: 4X exploration; many islands +
  //   channels-as-funnels reward scouting + naval/settler play.
  'age-of-strata': {
    mapSize: 'huge',
    matchLength: 'long',
    turnsMode: 'turn-based',
    mapType: 'archipelago',
    guidedMapGen: true,
    invulnerableBases: false,
    // M_TURNS.2 — 60 turns is the 4X-genre canonical match length
    // (Civ standard) — long enough for tech progression, short
    // enough that a session fits in one sitting.
    maxTurns: 60,
    // M_PIVOT.MODES.4X — 4X mode defaults to 6-player FFA. The
    // barbarian-camp auto-spawn in startGame picks up the factions
    // count + creates clamp(round(6/2)+1, 1, 6) = 4 camps.
    defaultPlayerCount: 6,
  },
  // M_EXPANSION.F.100 — Coexistence: no win condition. Sparse
  //   mountains (archipelago) keep the sandbox permissive;
  //   invulnerableBases prevents either base from dying;
  //   endless match-length disables the resign-by-starvation flip.
  //   Game runs until the player closes the window — useful for
  //   builder-mode play.
  coexistence: {
    mapSize: 'large',
    matchLength: 'endless',
    turnsMode: 'real-time',
    mapType: 'archipelago',
    guidedMapGen: true,
    invulnerableBases: true,
    maxTurns: null,
    defaultPlayerCount: 2,
  },
};

/** Resolve the preset for a mode; defaults to border-clash for unknown input. */
export function presetFor(mode: GameMode | undefined): ModePreset {
  return MODE_PRESETS[mode ?? 'border-clash'];
}
