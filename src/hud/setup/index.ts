/**
 * hud/setup — the new-game configuration surface (M_V13.DECOMP.HUD-SETUP).
 *
 * The controls NewGameModal composes: seed entry + live map preview,
 * opponent/faction-color pickers, preset chips, and the shared
 * option tables (modes, difficulties, colors, starting bonuses).
 */
export { SeedField, type SeedFieldProps } from './SeedField';
export { MapPreview, type MapPreviewProps } from './MapPreview';
export { PresetControls, type PresetControlsProps } from './PresetControls';
export { OpponentPicker, type OpponentPickerProps } from './OpponentPicker';
export { FactionColorPicker, type FactionColorPickerProps } from './FactionColorPicker';
export {
  MODES,
  DIFFICULTIES,
  PLAYER_COLORS,
  STARTING_BONUSES,
  type StartingBonus,
} from './new-game-options';
