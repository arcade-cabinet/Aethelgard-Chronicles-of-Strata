/**
 * M_MICRO.10.1 — shared modal shell.
 *
 * 6 dialogs (NewGameModal, OnboardingOverlay, GameOverModal,
 * SettingsModal, ResignButton confirm, DiscoveriesPanel) all wrapped
 * `<Dialog.Overlay>` + `<Dialog.Content>` with near-identical inline
 * styles (centred card, panel background, border-radius 14, padding 24,
 * 90vw / max width). ~30 LOC of style boilerplate per dialog →
 * ~200 LOC of duplication across 6 sites.
 *
 * `<ModalShell>` is the wrapper. Per-dialog overrides (width, max-
 * height, z-index, id) come through props; everything else is the
 * HUD theme constant. The caller renders only the meaningful content.
 *
 * Usage:
 *
 *   <Dialog.Root open={open} onOpenChange={onOpenChange}>
 *     <ModalShell width="520px" zIndex={100}>
 *       <Dialog.Title>...</Dialog.Title>
 *       …content…
 *     </ModalShell>
 *   </Dialog.Root>
 */
import * as Dialog from '@radix-ui/react-dialog';
import type { CSSProperties, ReactNode } from 'react';
import { HUD_THEME } from '../theme';

export interface ModalShellProps {
  /** Modal content (Dialog.Title + body). */
  children: ReactNode;
  /** CSS width string, e.g. `"min(520px, 90vw)"`. */
  width?: string;
  /** CSS maxHeight string. */
  maxHeight?: string;
  /** z-index for the overlay + content. Defaults to 100. */
  zIndex?: number;
  /** Optional id for the content element (for aria-describedby links). */
  contentId?: string;
  /** Optional extra style merged onto Dialog.Content. */
  contentStyle?: CSSProperties;
  /**
   * If true, block Escape + outside-click close paths — for terminal
   * dialogs like GameOverModal where the player must use the modal's
   * own action button to proceed.
   */
  blockClose?: boolean;
}

/** Reusable Dialog.Overlay + Dialog.Content shell with the project's card styling. */
export function ModalShell({
  children,
  width = 'min(520px, 90vw)',
  maxHeight = '80vh',
  zIndex = 100,
  contentId,
  contentStyle,
  blockClose = false,
}: ModalShellProps) {
  const block = blockClose
    ? {
        onEscapeKeyDown: (e: Event) => e.preventDefault(),
        onPointerDownOutside: (e: Event) => e.preventDefault(),
      }
    : {};
  return (
    <Dialog.Portal>
      <Dialog.Overlay
        style={{
          position: 'fixed',
          inset: 0,
          // M_POLISH2.M.6 — bumped from 0.7 / 0.9 → 0.88 / 0.94 and
          // added a 4px backdrop-blur so the TitleScreen's bright
          // gold heading + accent buttons don't ghost through every
          // modal. The blur is gated to capable browsers (chrome /
          // safari ≥9 / firefox ≥103); older browsers fall back to
          // the higher opacity alone.
          background: blockClose ? 'rgba(3,7,18,0.94)' : 'rgba(3,7,18,0.88)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          zIndex,
        }}
      />
      <Dialog.Content
        id={contentId}
        aria-describedby={undefined}
        {...block}
        // M_AUDIT2.UX.23 — tag every ModalShell with data-hud-panel
        // so SelectionRect.onDown's existing `closest('[data-hud-panel]')`
        // guard sees the modal and skips arming a drag. Without this,
        // a pointerdown inside a modal could start a phantom selection
        // rectangle behind the dialog overlay.
        data-hud-panel="modal"
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width,
          maxHeight,
          overflow: 'auto',
          background: HUD_THEME.color.panel,
          border: `2px solid ${HUD_THEME.color.border}`,
          borderRadius: 14,
          padding: 24,
          color: HUD_THEME.color.text,
          zIndex: zIndex + 1,
          ...contentStyle,
        }}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
