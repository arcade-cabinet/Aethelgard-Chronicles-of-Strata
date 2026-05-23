import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { resign } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { useViewport } from '@/render/useViewport';
import { HUD_THEME } from './hud-theme';

/**
 * Resign HUD button (M_MODES.10). Always visible during gameplay; opens a
 * confirm dialog (irreversible action). On confirm, calls `resign('player')`
 * — game.outcome flips to 'loss' and the GameOverModal surfaces.
 */
export function ResignButton({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  const viewport = useViewport();
  if (game.outcome !== 'playing') return null;
  const rightPx = viewport.isPortrait ? 8 : 460;
  const topPx = viewport.isPortrait ? 96 : 12;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          id="resign-button"
          data-hud-panel
          aria-label="Resign the current match"
          style={{
            position: 'absolute',
            top: topPx,
            right: rightPx,
            zIndex: 6,
            padding: '6px 14px',
            borderRadius: 999,
            background: HUD_THEME.color.panel,
            color: '#f87171',
            border: '1px solid rgba(248,113,113,0.35)',
            fontFamily: HUD_THEME.font.body,
            fontSize: '0.72rem',
            fontWeight: 700,
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          ⚑ Resign
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.7)', zIndex: 100 }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(360px, 90vw)',
            padding: 22,
            background: HUD_THEME.color.panel,
            border: `2px solid ${HUD_THEME.color.border}`,
            borderRadius: 12,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            zIndex: 101,
          }}
        >
          <Dialog.Title
            style={{
              fontFamily: HUD_THEME.font.display,
              fontSize: '1.2rem',
              color: '#f87171',
              margin: '0 0 10px',
            }}
          >
            Resign?
          </Dialog.Title>
          <p style={{ fontSize: '0.85rem', color: HUD_THEME.color.muted, margin: '0 0 18px' }}>
            Concede the match. Your enemy claims victory.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: `1px solid ${HUD_THEME.color.border}`,
                background: 'rgba(0,0,0,0.3)',
                color: HUD_THEME.color.muted,
                fontFamily: HUD_THEME.font.body,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              id="resign-confirm"
              onClick={() => {
                resign(game, 'player');
                setOpen(false);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: 8,
                border: 'none',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 700,
                fontFamily: HUD_THEME.font.body,
                cursor: 'pointer',
              }}
            >
              Resign
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
