/**
 * HeroBanner — gradient strip with a lucide icon-tile + counter label
 * (M_HUD.SHELL.10).
 *
 * Used by OnboardingOverlay step header (Sparkles / Eye / Compass /
 * Hammer / Swords / Shield / Search / FlaskConical / Crown / Users +
 * "STEP N OF M"), future SettingsModal section dividers, future
 * achievement card. 18s ease-in-out horizontal gradient drift —
 * reduced-motion safe.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { ComponentType, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface HeroBannerProps {
  /** lucide icon component (e.g. `Sparkles` from `lucide-react`). */
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Right-aligned counter / caption (e.g. "Step 3 of 9"). */
  caption?: ReactNode;
  /** Optional className passthrough on the wrapper. */
  className?: string;
  /** Height in any CSS length. Default '6rem'. */
  height?: string;
}

export function HeroBanner({
  icon: Icon,
  caption,
  className,
  height = '6rem',
}: HeroBannerProps) {
  const reducedMotion = useReducedMotion() ?? false;
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ height }}>
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(110deg, rgba(212,175,55,0.35) 0%, rgba(56,189,248,0.25) 45%, rgba(212,175,55,0.30) 100%)',
          backgroundSize: '220% 100%',
        }}
        animate={
          reducedMotion
            ? { backgroundPosition: '0% 0%' }
            : { backgroundPosition: ['0% 0%', '100% 0%', '0% 0%'] }
        }
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 18, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
        }
      />
      <div className="absolute inset-0 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-xl',
              'border border-[var(--color-treasure)]/50 bg-black/40 shadow-lg',
              'text-[var(--color-treasure)]',
            )}
          >
            <Icon className="h-6 w-6" aria-hidden />
          </div>
          {caption && (
            <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-on-surface-muted)]">
              {caption}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
