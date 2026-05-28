/**
 * `@/hud/theme` — the HUD design-token + formatting barrel.
 *
 * M_V13.DECOMP.HUD-THEME — leaf sub-package every other HUD package
 * imports. Holds the obsidian/gold token set (HUD_THEME,
 * HUD_CARD_STYLE) and the shared formatters (costLabel, formatInt,
 * formatTime). External code imports from here, never the deep
 * file paths.
 */
export {
  HUD_CARD_STYLE,
  HUD_THEME,
  safeTop,
  safeBottom,
  safeLeft,
  safeRight,
} from './hud-theme';
export { costLabel, formatInt, formatTime } from './format';
export { topCenterSlot, TOP_CENTER_SLOT } from './hud-layout';
