/**
 * OnboardingOverlay — cinematic first-run tutorial (M_HUD.SHELL.4).
 *
 * Full-page overlay on top of the live game canvas. Steps through 9
 * teaching cards (10 when ≥3 factions). Each card has a hero gradient
 * strip with a lucide step-icon, a step counter, gold Metamorphous
 * title, Inter body, Skip / Back / Next action row, kbd hint chips.
 *
 * Reads + writes the `onboarding` Preferences flag so it only fires
 * once. Exposes `window.__skipOnboarding` for e2e + dev.
 *
 * Step content is preserved verbatim — the test suite greps the
 * STEPS + N_PLAYER_STEP exports.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Eye,
  FlaskConical,
  Hammer,
  Search,
  Shield,
  Sparkles,
  Swords,
  User2,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';
import { HeroBanner, StepProgressDots, TreasureButton } from './primitives';

const ONBOARDING_KEY = PREF_KEYS.onboarding;

/** One step of the tutorial — heading + one-paragraph teaching. */
interface Step {
  title: string;
  body: string;
}

/** M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR — exported for unit tests. */
export const STEPS: Step[] = [
  {
    title: 'Welcome to Aethelgard',
    body: "You command a kingdom on a hex-tile island. The enemy commands one too. The first to raze the other's base wins. Watch your peons auto-harvest; the resources you see at the top fund your buildings.",
  },
  {
    title: 'Reading the HUD',
    body: 'Top-left shows your resources. The pill at top-centre tells you what you need to do to win this mode. Top-right is pause + speed. Bottom-right has the 🏗 build button; bottom-left flashes if any peon is idle.',
  },
  {
    title: 'Peons are autonomous',
    body: "Your peons find the nearest resource in your zone of control and harvest it. They never need orders — and they're nonviolent. As they exploit tiles, your zone of control (the blue border) grows.",
  },
  {
    title: 'Tap to build',
    body: 'Tap the 🏗 button (bottom-right) to open your Town Hall build menu. Farms raise your supply, Houses raise the peon cap, Barracks train Footmen, Watchtowers shoot intruders, Walls block enemy pathing.',
  },
  {
    title: 'Commanding military',
    body: 'TAP a Footman (or any military unit) to select it. TAP a destination tile to send it there. To select many units at once: tap-and-hold one, then drag — every unit your finger crosses joins the group.',
  },
  {
    title: 'Defend the border',
    body: 'If an enemy steps onto a tile YOU control, it pulses yellow. Send a Footman to defend it before the pulse expires — otherwise the tile flips to the enemy. Lose your Town Hall and you lose.',
  },
  {
    title: 'Camera + zoom',
    body: 'PINCH on the canvas to zoom. TAP-AND-HOLD on empty terrain, then drag to pan the camera. The minimap (top-right on phone, bottom-right on desktop) is also tappable — tap any spot to centre the camera there.',
  },
  {
    title: 'Discoveries',
    body: "Open the Discoveries pill at any time. Each Discovery's prereqs are listed inline; ✓ means met, ✗ means missing. Status pip on the left: green=owned, amber=ready to buy, red=can't afford, gray=gated by prereqs.",
  },
  {
    title: 'Winning the realm',
    body: 'Every game mode has its own win condition — shown in the top-centre pill. Border-clash: raze the enemy Town Hall. Strata-wars: control 80% of the realm for 30s. Age-of-Strata: reach Renaissance + build a Wonder. Resign at any time from the ☰ menu.',
  },
];

/** N-player slide content. M_V9.TEST.SOURCE-GREP-TO-BEHAVIOR — exported for unit tests. */
export const N_PLAYER_STEP: Step = {
  title: 'Multiple factions',
  body: 'Multiple factions have joined the map. Build your economy, form alliances, and be the last faction standing. Use the diplomacy panel to propose non-aggression pacts or demand tribute from weaker rivals.',
};

/** One icon per step — lucide. */
const STEP_ICONS = [
  Sparkles,
  Eye,
  User2,
  Hammer,
  Swords,
  Shield,
  Search,
  FlaskConical,
  Crown,
  Users,
] as const;

export interface OnboardingOverlayProps {
  persistence: Persistence;
  /** M_V8.TUTORIAL.N-PLAYER-MODE — append the N-player slide when > 2. */
  factionCount?: number;
}

export function OnboardingOverlay({ persistence, factionCount = 2 }: OnboardingOverlayProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const steps = factionCount > 2 ? [...STEPS, N_PLAYER_STEP] : STEPS;
  const current = steps[step] ?? steps[0];
  const isLast = step + 1 >= steps.length;
  const StepIcon = STEP_ICONS[Math.min(step, STEP_ICONS.length - 1)] ?? Sparkles;

  const markSeen = useCallback(() => {
    setOpen(false);
    persistence.setSetting(ONBOARDING_KEY, 'true').catch((err) => {
      console.warn('[OnboardingOverlay] setSetting failed:', err);
    });
  }, [persistence]);

  const next = useCallback(() => {
    if (step + 1 >= steps.length) markSeen();
    else setStep(step + 1);
  }, [step, steps.length, markSeen]);

  const back = useCallback(() => {
    if (step > 0) setStep(step - 1);
  }, [step]);

  // First-mount: should we open?
  useEffect(() => {
    let cancelled = false;
    void safePersistenceRead(
      persistence,
      ONBOARDING_KEY,
      (raw) => raw !== 'true',
      true,
      'OnboardingOverlay',
    ).then((shouldOpen) => {
      if (!cancelled && shouldOpen) setOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [persistence]);

  // M_POLISH3.SCENE.3 — e2e/dev hook to dismiss without 9 clicks.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    type DevWindow = Window & { __skipOnboarding?: () => Promise<void> };
    (window as unknown as DevWindow).__skipOnboarding = async () => {
      setOpen(false);
      await persistence.setSetting(ONBOARDING_KEY, 'true');
    };
  }, [persistence]);

  // M_HUD.SHELL.6 — keyboard nav retired. Onboarding is tap-only.

  if (!current) return null;

  return (
    <Dialog.Root open={open}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="fixed inset-0 bg-[rgba(9,13,22,0.78)] backdrop-blur-md"
                style={{ zIndex: 900 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onEscapeKeyDown={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <motion.div
                id="onboarding-overlay"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                  'w-[min(560px,calc(100vw-32px))] max-h-[min(88dvh,720px)] overflow-hidden',
                  'rounded-3xl border bg-[var(--color-surface-solid)] text-[var(--color-on-surface)]',
                  'border-[var(--color-border)] shadow-2xl',
                )}
                style={{
                  zIndex: 901,
                  paddingTop: 'var(--safe-top)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <HeroBanner icon={StepIcon} caption={`Step ${step + 1} of ${steps.length}`} />

                <div className="px-6 pb-1 pt-4">
                  <StepProgressDots total={steps.length} current={step} />
                </div>

                {/* Card body with cross-fade step transition */}
                <div className="px-6 pb-6 pt-2">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`step-${step}`}
                      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Dialog.Title
                        className="font-display text-2xl font-bold tracking-[0.04em] text-[var(--color-treasure)]"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        {current.title}
                      </Dialog.Title>
                      <div className="mt-1 h-px w-12 bg-[var(--color-treasure)]/60" />
                      <Dialog.Description asChild>
                        <p className="mt-4 text-sm leading-relaxed text-[var(--color-on-surface)]/90">
                          {current.body}
                        </p>
                      </Dialog.Description>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Action row */}
                <div className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] px-6 py-4">
                  <button
                    type="button"
                    aria-label="Skip the tutorial"
                    data-testid="onboarding-skip"
                    onClick={markSeen}
                    className="rounded-md px-3 py-2 text-xs text-[var(--color-on-surface-muted)] hover:bg-white/5 hover:text-[var(--color-on-surface)]"
                  >
                    Skip tutorial
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={back}
                      disabled={step === 0}
                      aria-label="Previous step"
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-lg border transition-colors',
                        'border-[var(--color-border)] bg-black/30 text-[var(--color-on-surface-muted)]',
                        step === 0
                          ? 'cursor-not-allowed opacity-40'
                          : 'hover:border-[var(--color-accent)]/60 hover:text-[var(--color-on-surface)]',
                      )}
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden />
                    </button>
                    <TreasureButton
                      id="onboarding-next"
                      aria-label={isLast ? 'Begin Realm — start the match' : 'Next tutorial step'}
                      onClick={next}
                      icon={isLast ? <Swords className="h-4 w-4" aria-hidden /> : undefined}
                      className={cn(
                        'px-5 py-2.5 text-sm',
                        isLast && !reducedMotion && 'animate-pulse',
                      )}
                    >
                      {isLast ? (
                        'Begin Realm'
                      ) : (
                        <span className="flex items-center gap-2">
                          Next
                          <ChevronRight className="h-4 w-4" aria-hidden />
                        </span>
                      )}
                    </TreasureButton>
                  </div>
                </div>

                {/* M_HUD.SHELL.6 — kbd hint chips retired (mobile-first). */}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
