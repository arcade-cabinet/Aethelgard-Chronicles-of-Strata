/**
 * M_SIMPLIFY.7 — pure-data options for NewGameModal.
 *
 * These four tables are static config (no React, no runtime
 * dependency). Extracting them out of the 600-line modal cuts
 * cognitive load when reading the component; the modal imports
 * from here and renders.
 */
import type { Difficulty, GameMode } from '@/game/game-state';

/**
 * M_BRAND.1 — brand-aligned mode labels. Keys are stable for save
 * serialization; labels are player-facing. M_BRAND.2 cascades the
 * preset's mapSize/AI/turnsMode/maxTurns into the visible controls
 * so the player sees what the preset implies without a tagline;
 * M_BRAND.3 frames the picker under a "Realm preset" heading and
 * flips to "Custom Realm" once any control is altered.
 */
export const MODES: ReadonlyArray<{ key: GameMode; label: string }> = [
  { key: 'border-clash', label: 'Border Clash' },
  { key: 'frontier-raid', label: 'Frontier Raid' },
  { key: 'long-reign', label: 'Long Reign' },
  { key: 'strata-wars', label: 'Strata Wars' },
  { key: 'age-of-strata', label: 'Age of Strata' },
  { key: 'coexistence', label: 'Coexistence' },
];

export const DIFFICULTIES: ReadonlyArray<Difficulty> = ['easy', 'normal', 'hard'];

/**
 * M_EXPANSION.F.80 — palette pick options. 4 banner colours + a
 * "Default" pick that uses the SKINS native armor colours. Each
 * entry is a CSS hex string the renderer multiplies into the
 * character material's diffuse.
 */
export const PLAYER_COLORS: ReadonlyArray<{ key: string; label: string; hex: string | null }> = [
  { key: 'default', label: 'Default', hex: null },
  { key: 'red', label: 'Red', hex: '#ef4444' },
  { key: 'blue', label: 'Blue', hex: '#3b82f6' },
  { key: 'green', label: 'Green', hex: '#22c55e' },
  { key: 'yellow', label: 'Yellow', hex: '#eab308' },
];

/**
 * M_EXPANSION.F.84 — starting bonus picks. Surfaces as a 4-segment
 * control under the palette picker. Each pick gives the player a
 * distinct one-shot advantage at match start; the AI never gets
 * one (the bonus IS the difficulty handicap dial).
 */
export type StartingBonus = 'none' | 'extra-wood' | 'extra-peons' | 'extra-hp';

export const STARTING_BONUSES: ReadonlyArray<{ key: StartingBonus; label: string }> = [
  { key: 'none', label: 'None' },
  { key: 'extra-wood', label: '+Wood' },
  { key: 'extra-peons', label: '+Peons' },
  { key: 'extra-hp', label: '+HP' },
];
