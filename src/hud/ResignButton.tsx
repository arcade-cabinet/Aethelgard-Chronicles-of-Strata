import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { resign } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { HudPill } from './primitives';
import { HUD_THEME } from './theme';
import { ModalShell } from './primitives';

/**
 * Resign HUD button (M_MODES.10). Always visible during gameplay; opens a
 * confirm dialog (irreversible action). On confirm, calls `resign('player')`
 * — game.outcome flips to 'loss' and the GameOverModal surfaces.
 */
export function ResignButton({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  if (game.outcome !== 'playing') return null;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {/* M_MICRO.10.2 — HudPill picks (top, right) from its slot table;
            `danger` variant carries the red-on-panel pill look. */}
        <HudPill
          slot="resign"
          id="resign-button"
          variant="danger"
          ariaLabel="Resign the current match"
          style={{ fontSize: '0.72rem' }}
        >
          ⚑ Resign
        </HudPill>
      </Dialog.Trigger>
      {/* M_MICRO.10.1 — ModalShell unifies the dialog card. */}
      <ModalShell
        width="min(360px, 90vw)"
        maxHeight="none"
        contentStyle={{
          padding: 22,
          borderRadius: 12,
          fontFamily: HUD_THEME.font.body,
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
      </ModalShell>
    </Dialog.Root>
  );
}
