/**
 * IconButton — bordered icon-only button (M_HUD.SHELL.10).
 *
 * Used in TitleScreen icon strip (mute / theme), every modal close X,
 * SystemMenu drawer chrome. Drives the .btn-ghost-icon utility.
 */
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends Omit<ComponentProps<'button'>, 'children' | 'aria-label'> {
  /** REQUIRED — every IconButton must self-describe for screen readers + Maestro. */
  'aria-label': string;
  /** The lucide icon (or other SVG) to render. */
  children: ReactNode;
}

export function IconButton({ children, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button type={type} className={cn('btn-ghost-icon', className)} {...rest}>
      {children}
    </button>
  );
}
