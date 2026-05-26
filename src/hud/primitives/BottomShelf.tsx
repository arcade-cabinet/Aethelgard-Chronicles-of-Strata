/**
 * BottomShelf — touch-reachable in-game action shelf for narrow
 * viewports (M_HUD.SHELL.20b).
 *
 * On non-desktop viewports, groups the in-game CTAs (Build, End Turn,
 * mode-specific buttons) into a fixed bottom-right cluster sitting
 * above the safe-area-inset. On desktop / ultraWide, returns
 * children inline so each consumer's own absolute positioning wins
 * (no shelf, the existing top/right/bottom anchors remain).
 *
 * Composes with FactionChips' top-center trigger (M_HUD.SHELL.20) +
 * SystemMenu's top-right trigger (M_HUD.SHELL.1) so on a foldable /
 * phone the entire visible chrome is: WinPill top + FactionChips
 * trigger top + SystemMenu trigger top-right + ResourceBar top-left
 * + BottomShelf bottom-right.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { useViewport } from '@/render/useViewport';

export interface BottomShelfProps {
  children: ReactNode;
  className?: string;
}

export function BottomShelf({ children, className }: BottomShelfProps) {
  const viewport = useViewport();
  const isWide = viewport.class === 'desktop' || viewport.class === 'ultraWide';
  // On wide viewports the shelf is a passthrough — consumers position
  // themselves wherever they were before.
  if (isWide) return <>{children}</>;
  return (
    <div
      data-testid="bottom-shelf"
      className={cn(
        'hud-interactive fixed flex items-center gap-2',
        'rounded-2xl border bg-[var(--color-surface)] p-2',
        'border-[var(--color-border)] shadow-2xl backdrop-blur',
        className,
      )}
      style={{
        bottom: 'calc(var(--safe-bottom) + 16px)',
        right: 'calc(var(--safe-right) + 16px)',
        zIndex: 'var(--z-hud-pill)',
      }}
    >
      {children}
    </div>
  );
}
