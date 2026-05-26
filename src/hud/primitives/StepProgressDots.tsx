/**
 * StepProgressDots — pill-row indicator (M_HUD.SHELL.10).
 *
 * Used in OnboardingOverlay (9 steps) + future PackOpening / Tutorial
 * advancing flows. Current step is gold, past steps muted, future
 * steps dim.
 */
import { cn } from '@/lib/cn';

export interface StepProgressDotsProps {
  total: number;
  current: number;
}

export function StepProgressDots({ total, current }: StepProgressDotsProps) {
  return (
    <div
      role="progressbar"
      aria-label={`Step ${current + 1} of ${total}`}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      className="flex gap-1.5"
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: step index IS the identity.
          key={`progress-dot-${i}`}
          aria-hidden
          className={cn(
            'h-1.5 flex-1 rounded-full transition-colors',
            i < current && 'bg-[var(--color-on-surface-muted)]/60',
            i === current && 'bg-[var(--color-treasure)]',
            i > current && 'bg-white/8',
          )}
        />
      ))}
    </div>
  );
}
