/**
 * SystemMenu — universal top-right hamburger that consolidates the
 * "system chrome" buttons (Settings, Discoveries, Legend, Sound toggle,
 * Resign) into a single right-side slide-in drawer.
 *
 * Mounts on EVERY viewport. The prior pattern had Discoveries, Legend,
 * ResignButton, and SoundToggle as separate top-bar pills, which on
 * narrow + N-player viewports (foldable, tablet, phone) collided with
 * the resource bar + faction chips into an overcrowded horizontal mess
 * (user feedback 2026-05-25 OnePlus Open screenshot).
 *
 * The drawer is a Radix Dialog primitive with custom slide-from-right
 * animation. Trigger + drawer panel set pointer-events:auto so the 3D
 * canvas underneath stays raycast-pickable through the transparent
 * portions of the overlay.
 *
 * Each menu item is either:
 *  - A direct callback (Settings → opens SettingsModal via prop)
 *  - An event dispatcher (Discoveries / Legend → CustomEvent the
 *    respective panel listens for and opens itself)
 *  - A toggle (Sound → flips the persistence-stored audio mute)
 *  - A destructive action with tap-to-confirm (Resign)
 */
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  Flag,
  Handshake,
  Map as MapIcon,
  Menu,
  Settings as SettingsIcon,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { resign } from '@/game/commands';
import type { GameState } from '@/game/game-state';
import { cn } from '@/lib/cn';

export interface SystemMenuProps {
  game: GameState;
  /** Opens the SettingsModal (App.tsx owns the state). */
  onSettings: () => void;
  /** Current mute state — drives the Sound row label + icon. */
  soundMuted?: boolean;
  /** Flip the mute. App.tsx pipes this through to the persistence layer. */
  onToggleSound?: (nextMuted: boolean) => void;
}

interface MenuRow {
  id: string;
  Icon: typeof Menu;
  label: string;
  rightSlot?: React.ReactNode;
  onSelect: () => void;
  variant?: 'default' | 'danger';
  /** When true the drawer stays open after select (toggles, e.g. sound). */
  keepOpen?: boolean;
}

export function SystemMenu({ game, onSettings, soundMuted, onToggleSound }: SystemMenuProps) {
  const [open, setOpen] = useState(false);
  const [confirmingResign, setConfirmingResign] = useState(false);

  const handleResign = () => {
    if (!confirmingResign) {
      setConfirmingResign(true);
      window.setTimeout(() => setConfirmingResign(false), 4000);
      return;
    }
    setConfirmingResign(false);
    resign(game);
    setOpen(false);
  };

  const rows: MenuRow[] = [
    {
      id: 'settings',
      Icon: SettingsIcon,
      label: 'Settings',
      onSelect: () => {
        onSettings();
        setOpen(false);
      },
    },
    {
      id: 'discoveries',
      Icon: Compass,
      label: 'Discoveries',
      onSelect: () => {
        window.dispatchEvent(new CustomEvent('aethelgard:open-discoveries'));
        setOpen(false);
      },
    },
    {
      id: 'diplomacy',
      Icon: Handshake,
      label: 'Diplomacy',
      onSelect: () => {
        window.dispatchEvent(new CustomEvent('aethelgard:open-diplomacy'));
        setOpen(false);
      },
    },
    {
      id: 'legend',
      Icon: MapIcon,
      label: 'Zone Legend',
      onSelect: () => {
        window.dispatchEvent(new CustomEvent('aethelgard:toggle-legend'));
        setOpen(false);
      },
    },
    {
      id: 'sound',
      Icon: soundMuted ? VolumeX : Volume2,
      label: soundMuted ? 'Unmute' : 'Mute',
      keepOpen: true,
      onSelect: () => onToggleSound?.(!soundMuted),
    },
    {
      id: 'resign',
      Icon: Flag,
      label: confirmingResign ? 'Tap again to surrender' : 'Resign',
      variant: 'danger',
      keepOpen: true,
      onSelect: handleResign,
    },
  ];

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          id="system-menu-trigger"
          data-testid="system-menu-trigger"
          aria-label="Open system menu"
          className={cn(
            'hud-interactive fixed flex items-center justify-center',
            'h-11 w-11 rounded-full border shadow-lg transition-colors',
            'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-on-surface)]',
            'hover:bg-[var(--color-surface-solid)] active:scale-95',
          )}
          style={{
            top: 'calc(var(--safe-top) + 8px)',
            right: 'calc(var(--safe-right) + 8px)',
            zIndex: 'var(--z-hud-trigger)',
          }}
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="hud-interactive fixed inset-0 bg-black/45 backdrop-blur-[2px]"
                style={{ zIndex: 'var(--z-hud-drawer)' }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.aside
                key="system-menu-drawer"
                data-testid="system-menu-drawer"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 360, damping: 36 }}
                className={cn(
                  'hud-interactive fixed top-0 right-0 flex h-full w-[min(320px,86vw)] flex-col',
                  'border-l shadow-2xl',
                  'border-[var(--color-border)] bg-[var(--color-surface-solid)]/95 backdrop-blur-md',
                )}
                style={{
                  zIndex: 'calc(var(--z-hud-drawer) + 1)',
                  paddingTop: 'var(--safe-top)',
                  paddingRight: 'var(--safe-right)',
                  paddingBottom: 'var(--safe-bottom)',
                }}
              >
                <header className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
                  <Dialog.Title
                    className="font-display text-lg font-bold text-[var(--color-treasure)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Aethelgard
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      aria-label="Close menu"
                      className="hud-interactive flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-on-surface-muted)] hover:bg-white/5 hover:text-[var(--color-on-surface)]"
                    >
                      <X className="h-4 w-4" aria-hidden />
                    </button>
                  </Dialog.Close>
                </header>
                <Dialog.Description className="sr-only">
                  System menu — settings, discoveries, legend, sound, resign.
                </Dialog.Description>
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                  <ul className="flex flex-col gap-1">
                    {rows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          id={`system-menu-${row.id}`}
                          data-testid={`system-menu-${row.id}`}
                          aria-label={row.label}
                          onClick={row.onSelect}
                          className={cn(
                            'hud-interactive flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-colors',
                            'text-sm font-medium',
                            row.variant === 'danger'
                              ? confirmingResign
                                ? 'bg-[var(--color-danger)]/20 text-[var(--color-danger)]'
                                : 'text-[var(--color-danger)]/90 hover:bg-[var(--color-danger)]/10'
                              : 'text-[var(--color-on-surface)] hover:bg-white/5',
                          )}
                        >
                          <row.Icon className="h-4 w-4 shrink-0" aria-hidden />
                          <span className="flex-1">{row.label}</span>
                          {row.rightSlot}
                        </button>
                      </li>
                    ))}
                  </ul>
                </nav>
                <footer className="border-t border-[var(--color-border)] px-5 py-3 text-center">
                  <span className="text-xs text-[var(--color-on-surface-muted)]">
                    seed · {game.seedPhrase}
                  </span>
                </footer>
              </motion.aside>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
