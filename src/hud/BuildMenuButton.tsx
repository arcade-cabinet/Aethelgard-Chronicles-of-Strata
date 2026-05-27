import { HUD_THEME } from './hud-theme';

/**
 * M_POLISH2.B.1 — touch-reachable affordance for opening the build
 * menu. The build flow lives on the SelectionPanel that appears
 * after selecting the Palace; this button dispatches the
 * `aethelgard:open-build-menu` event that App.tsx now listens for
 * (and which selects the player's Palace, surfacing the panel).
 *
 * On desktop the keyboard `B` already dispatches the same event, so
 * this is mobile-first BUT not mobile-only — desktop users get a
 * visible HUD chip too.
 *
 * Positioned bottom-right of the screen (above the home-bar inset
 * + above the minimap on mobile). Hidden when the SelectionPanel is
 * already open AND the selected entity is the player's Palace (no
 * need for the chip when the build buttons are already on-screen).
 */
export function BuildMenuButton() {
  return (
    <button
      type="button"
      id="hud-build-menu-button"
      aria-label="Open build menu"
      onClick={() => window.dispatchEvent(new CustomEvent('aethelgard:open-build-menu'))}
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
        zIndex: 80,
        width: 56,
        height: 56,
        borderRadius: 28,
        border: `2px solid ${HUD_THEME.color.border}`,
        background: HUD_THEME.color.accent,
        color: HUD_THEME.color.obsidian,
        fontSize: 24,
        fontFamily: HUD_THEME.font.body,
        fontWeight: 700,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        // Visual hint: a faint plus glyph at the corner — recognisable
        // as "add building" without needing a tooltip.
      }}
    >
      🏗
    </button>
  );
}
