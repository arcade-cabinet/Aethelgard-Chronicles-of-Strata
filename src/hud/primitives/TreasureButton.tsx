/**
 * TreasureButton — THE primary CTA pattern (M_HUD.SHELL.10).
 *
 * Used by TitleScreen New Game, NewGameModal Begin Match,
 * OnboardingOverlay Begin Realm, GameOverModal Re-enter Aethelgard.
 *
 * Gold-gradient pill with shadow, hover-lift, active-press, optional
 * lucide leading icon. Honours the .btn-treasure utility class so
 * theme-flip cascades change the gradient automatically.
 */
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface TreasureButtonProps extends Omit<ComponentProps<'button'>, 'children'> {
  /** Leading icon — usually a lucide-react icon component result. */
  icon?: ReactNode;
  /** Button label. */
  children: ReactNode;
}

export function TreasureButton({
  icon,
  children,
  className,
  type = 'button',
  ...rest
}: TreasureButtonProps) {
  return (
    <button type={type} className={cn('btn-treasure', className)} {...rest}>
      {icon}
      <span className="relative z-10">{children}</span>
    </button>
  );
}
