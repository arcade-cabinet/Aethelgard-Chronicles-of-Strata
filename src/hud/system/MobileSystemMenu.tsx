import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useState } from 'react';
import { resign } from '@/game/utilities';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from '../theme';

/**
 * M_POLISH2.MOBILE.15 — single top-left hamburger that collapses
 * Resign + Settings into one Radix DropdownMenu on portrait phones.
 * Frees up the top-right slot (which on portrait already holds
 * the MobileSpeedPausePill from MOBILE.14).
 *
 * The trigger is a 44×44 round button with the canonical hamburger
 * glyph, anchored top-left with safe-area-inset awareness.
 *
 * Desktop keeps the original separate ResignButton + Settings link
 * on the title screen — this component only mounts on phonePortrait.
 */
export interface MobileSystemMenuProps {
  game: GameState;
  /** Called when the user picks Settings. */
  onSettings: () => void;
}

export function MobileSystemMenu({ game, onSettings }: MobileSystemMenuProps) {
  const [confirmingResign, setConfirmingResign] = useState(false);

  const handleResign = () => {
    if (!confirmingResign) {
      setConfirmingResign(true);
      // Auto-disarm the confirmation after 4s so a single accidental
      // tap doesn't leave the destructive option armed.
      window.setTimeout(() => setConfirmingResign(false), 4000);
      return;
    }
    setConfirmingResign(false);
    resign(game);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          id="mobile-system-menu-trigger"
          aria-label="System menu"
          style={{
            position: 'fixed',
            top: 'calc(env(safe-area-inset-top, 0px) + 8px)',
            left: 'calc(env(safe-area-inset-left, 0px) + 8px)',
            zIndex: 100,
            width: 44,
            height: 44,
            borderRadius: 22,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: HUD_THEME.color.panel,
            color: HUD_THEME.color.text,
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: '44px',
            padding: 0,
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          ☰
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          id="mobile-system-menu-content"
          align="start"
          sideOffset={8}
          style={{
            background: HUD_THEME.color.panel,
            border: `1px solid ${HUD_THEME.color.border}`,
            borderRadius: 12,
            padding: 6,
            minWidth: 160,
            boxShadow: '0 6px 18px rgba(0,0,0,0.55)',
            zIndex: 110,
          }}
        >
          <DropdownMenu.Item
            id="mobile-system-menu-settings"
            onSelect={onSettings}
            style={{
              padding: '10px 14px',
              fontFamily: HUD_THEME.font.body,
              fontSize: '0.9rem',
              color: HUD_THEME.color.text,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            ⚙ Settings
          </DropdownMenu.Item>
          <DropdownMenu.Separator
            style={{
              height: 1,
              background: HUD_THEME.color.border,
              margin: '4px 6px',
            }}
          />
          <DropdownMenu.Item
            id="mobile-system-menu-resign"
            onSelect={(e: Event) => {
              // Prevent the menu auto-closing when the first tap arms
              // the confirmation — the user needs to see the label
              // change and tap again to commit.
              if (!confirmingResign) e.preventDefault();
              handleResign();
            }}
            style={{
              padding: '10px 14px',
              fontFamily: HUD_THEME.font.body,
              fontSize: '0.9rem',
              color: confirmingResign ? HUD_THEME.color.danger : HUD_THEME.color.text,
              fontWeight: confirmingResign ? 700 : 400,
              cursor: 'pointer',
              borderRadius: 8,
            }}
          >
            {confirmingResign ? '⚠ Tap again to surrender' : '🏳 Resign'}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
