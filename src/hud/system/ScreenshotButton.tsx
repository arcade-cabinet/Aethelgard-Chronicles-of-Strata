import type { GameState } from '@/game/game-state';
import { HUD_THEME } from '../theme';

/**
 * M_POLISH2.MODES.44b — coexistence screenshot button.
 *
 * Captures the live r3f canvas via canvas.toDataURL('image/png') and
 * triggers a download as Aethelgard-{seed}-{timestamp}.png. Lets
 * players share diorama state on social media.
 *
 * Mounted only in coexistence mode (sandbox); the other modes don't
 * benefit from frequent screenshots since the gameplay loop is
 * different.
 *
 * Bottom-left at safe-area-inset-bottom + 16, opposite the
 * BuildMenuButton FAB at bottom-right.
 */
export function ScreenshotButton({ game }: { game: GameState }) {
  if (game.mode !== 'coexistence') return null;

  const onClick = () => {
    // The r3f canvas is the only non-minimap canvas in the DOM.
    const canvas = document.querySelector(
      'canvas:not(#minimap-canvas)',
    ) as HTMLCanvasElement | null;
    if (!canvas) return;
    let dataUrl: string;
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch {
      // toDataURL throws on a tainted canvas (cross-origin assets).
      // Aethelgard's r3f scene uses local assets only — shouldn't
      // happen, but fail silently rather than crash.
      return;
    }
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `Aethelgard-${game.seedPhrase}-${ts}.png`;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <button
      type="button"
      id="screenshot-button"
      aria-label="Screenshot the realm"
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
        left: 'calc(env(safe-area-inset-left, 0px) + 16px)',
        zIndex: 80,
        width: 48,
        height: 48,
        borderRadius: 24,
        border: `2px solid ${HUD_THEME.color.border}`,
        background: HUD_THEME.color.panel,
        color: HUD_THEME.color.gold,
        fontSize: 22,
        fontFamily: HUD_THEME.font.body,
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      }}
    >
      📷
    </button>
  );
}
