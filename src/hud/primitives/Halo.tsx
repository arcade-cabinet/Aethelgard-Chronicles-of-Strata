/**
 * Halo — pulsing radial behind a hero icon (M_HUD.SHELL.10).
 *
 * Used by GameOverModal (Trophy / Skull / Scale), future achievement-
 * unlock toast, post-match nickname reveal. Reduced-motion safe — the
 * idle pulse is frozen when prefers-reduced-motion is set.
 */
import { motion, useReducedMotion } from 'framer-motion';

export type HaloTone = 'treasure' | 'accent' | 'danger';

export interface HaloProps {
  tone?: HaloTone;
  /** CSS size value, e.g. '10rem'. Default '10rem'. */
  size?: string;
}

const TONE_TO_GRADIENT: Record<HaloTone, string> = {
  treasure: 'var(--halo-treasure-radial)',
  accent: 'var(--halo-accent-radial)',
  danger: 'var(--halo-danger-radial)',
};

export function Halo({ tone = 'treasure', size = '10rem' }: HaloProps) {
  const reducedMotion = useReducedMotion() ?? false;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
      style={{
        width: size,
        height: size,
        top: '1.5rem',
        background: TONE_TO_GRADIENT[tone],
        filter: 'blur(8px)',
      }}
      animate={
        reducedMotion
          ? { scale: 1, opacity: 0.7 }
          : { scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }
      }
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 3.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
      }
    />
  );
}
