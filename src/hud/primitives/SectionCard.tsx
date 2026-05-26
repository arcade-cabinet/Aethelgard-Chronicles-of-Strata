/**
 * SectionCard — bordered card with icon + heading + caption (M_HUD.SHELL.10).
 *
 * Used in NewGameModal (World / Mode / Opponents / Players sections),
 * SettingsModal sections, future DiscoveriesPanel tier-cards. Drives
 * the .surface-card utility.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface SectionCardProps {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  caption?: string;
  delay?: number;
  className?: string;
  children: ReactNode;
}

export function SectionCard({
  icon: Icon,
  title,
  caption,
  delay = 0,
  className,
  children,
}: SectionCardProps) {
  const reducedMotion = useReducedMotion() ?? false;
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn('surface-card', className)}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border)] px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--color-treasure)]" aria-hidden />
          <h3
            className="font-display text-base font-semibold tracking-[0.08em] text-[var(--color-treasure)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h3>
        </div>
        {caption && (
          <p className="hidden text-xs italic text-[var(--color-on-surface-muted)] sm:block">
            {caption}
          </p>
        )}
      </header>
      <div className="px-5 py-4">{children}</div>
    </motion.section>
  );
}
