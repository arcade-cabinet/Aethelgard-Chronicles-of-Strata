/**
 * TitleScreen — the launcher (M_HUD.SHELL.2).
 *
 * Adopted from the 21st.dev cinematic reference: PBR shader hero
 * (TitleBackground) behind a centred wordmark + 3-button action
 * stack + bottom icon strip + keyboard-shortcut popover + footer
 * meta row. Aethelgard-specific: preserves the test contract
 * (#title-screen, #title-heading, #menu-new-game, #menu-continue,
 * #menu-settings, #title-credits, #title-footer), the prop signature
 * (onNewGame / onContinue? / onSettings), and the existing wiring
 * (useTitleMusic, useMutedPreference, CreditsModal, __APP_VERSION__).
 */
import { motion, useReducedMotion } from 'framer-motion';
import { Moon, Sun, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMutedPreference } from '@/audio/useMutedPreference';
import { useTitleMusic } from '@/audio/useTitleMusic';
import { cn } from '@/lib/cn';
import { useTheme } from '@/lib/theme';
import type { Persistence } from '@/persistence/persistence';
import { CreditsModal } from './CreditsModal';
import { TitleBackground } from './TitleBackground';

export interface TitleScreenProps {
  /** Open the New Game modal. */
  onNewGame: () => void;
  /** Resume the most recent auto-save. Absent → Continue is disabled. */
  onContinue?: () => void;
  /** Open the Settings modal. */
  onSettings: () => void;
  /** Persistence facade — drives the mute toggle. */
  persistence: Persistence;
}

const ENTRY = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] as const },
  }),
};

export function TitleScreen({ onNewGame, onContinue, onSettings, persistence }: TitleScreenProps) {
  useTitleMusic();
  const reducedMotion = useReducedMotion() ?? false;
  const [muted, setMuted] = useMutedPreference(persistence);
  const [theme, setTheme] = useTheme(persistence);
  const [showCredits, setShowCredits] = useState(false);

  // M_HUD.SHELL.6 — keyboard shortcuts retired as primary navigation.
  // Aethelgard ships to Android + iOS where every user TAPS. Desktop
  // gets one convenience shortcut (Enter = primary action New Game)
  // but the visible UI never advertises kbd as the path. All
  // interactive surfaces are reachable + tested via aria-label + tap.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'Enter') onNewGame();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onNewGame]);

  const version = typeof __APP_VERSION__ === 'undefined' ? 'dev' : (__APP_VERSION__ as string);

  return (
    <main
      id="title-screen"
      aria-label="Aethelgard main menu"
      className="hud-interactive relative h-dvh w-screen overflow-hidden text-[var(--color-on-surface)] font-body"
      style={{ fontFamily: 'var(--font-body)' }}
    >
      <TitleBackground reducedMotion={reducedMotion} />

      {/* Centre stage — wordmark + tagline + action stack. Uses a
       * column flex so the eyebrow / wordmark / tagline / hook stay
       * tightly grouped while the action stack docks below. */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-10 px-6 py-12">
        <motion.div
          variants={ENTRY}
          initial="hidden"
          animate="visible"
          custom={0}
          className="text-center"
        >
          <p className="text-xs uppercase tracking-[0.5em] text-[var(--color-on-surface-muted)]">
            Chronicles of
          </p>
        </motion.div>

        <motion.div variants={ENTRY} initial="hidden" animate="visible" custom={0.08}>
          <motion.h1
            id="title-heading"
            animate={reducedMotion ? { y: 0 } : { y: [0, -8, 0] }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { duration: 6.4, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
            }
            className={cn(
              'text-center font-display',
              'text-[clamp(3rem,8vw,6.5rem)] leading-[0.95]',
              'tracking-[0.18em]',
            )}
            style={{
              fontFamily: 'var(--font-display)',
              backgroundImage:
                'linear-gradient(180deg, #fef3c7 0%, #d4af37 45%, #b45309 78%, #7c2d12 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
              filter: 'drop-shadow(0 12px 32px rgba(212,175,55,0.28))',
            }}
          >
            Aethelgard
          </motion.h1>
        </motion.div>

        <motion.div
          variants={ENTRY}
          initial="hidden"
          animate="visible"
          custom={0.18}
          className="text-center"
        >
          <p
            className="text-base uppercase tracking-[0.4em] text-[var(--color-accent)]"
            aria-hidden="true"
          >
            Chronicles of Strata
          </p>
          <p className="mt-3 max-w-xl text-sm italic text-[var(--color-on-surface-muted)]">
            Command the hex. Shape the era. Outlast the tribes.
          </p>
        </motion.div>

        <motion.div
          variants={ENTRY}
          initial="hidden"
          animate="visible"
          custom={0.28}
          className="flex w-full max-w-sm flex-col gap-3"
        >
          <PrimaryButton id="menu-new-game" onClick={onNewGame}>
            New Game
          </PrimaryButton>
          <SecondaryButton
            id="menu-continue"
            onClick={onContinue ?? (() => undefined)}
            disabled={!onContinue}
            disabledReason="No saved game yet — start a New Game"
          >
            Continue
          </SecondaryButton>
          <GhostButton id="menu-settings" onClick={onSettings}>
            Settings
          </GhostButton>
        </motion.div>

        {/* M_HUD.SHELL.6 — kbd-hint chips retired. Mobile-first means
            we don't advertise keyboard nav. The single Enter shortcut
            is a desktop convenience handled silently. */}
      </div>

      {/* Icon strip — bottom-right above safe area. */}
      <div
        className="hud-interactive absolute z-20 flex gap-2"
        style={{
          bottom: 'calc(var(--safe-bottom) + 16px)',
          right: 'calc(var(--safe-right) + 16px)',
        }}
      >
        <IconButton
          onClick={() => setMuted(!muted)}
          ariaLabel={muted ? 'Unmute audio' : 'Mute audio'}
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </IconButton>
        <IconButton
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          ariaLabel={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </IconButton>
      </div>

      {/* M_HUD.SHELL.6 — keyboard hints popover retired. Mobile-first. */}

      {/* Footer meta row — bottom-left version + credits. */}
      <div
        id="title-footer"
        className="hud-interactive absolute z-20 flex items-center gap-3 text-[0.62rem] uppercase tracking-[0.18em] text-[var(--color-on-surface-muted)]"
        style={{
          bottom: 'calc(var(--safe-bottom) + 12px)',
          left: 'calc(var(--safe-left) + 16px)',
        }}
      >
        <span>v{version}</span>
        <span className="opacity-50">·</span>
        <span>r3f · koota · yuka</span>
        <span className="opacity-50">·</span>
        <button
          type="button"
          id="title-credits"
          onClick={() => setShowCredits(true)}
          className="text-[var(--color-accent)] underline-offset-2 hover:underline"
        >
          Credits
        </button>
      </div>

      <CreditsModal open={showCredits} onOpenChange={setShowCredits} />
    </main>
  );
}

// --------------- button primitives ---------------

interface ButtonBaseProps {
  id: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  disabledReason?: string;
}

function PrimaryButton({ id, onClick, children }: ButtonBaseProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={cn(
        'group relative overflow-hidden rounded-xl px-6 py-4 font-display text-lg',
        'border border-[#d4af37]/60',
        'bg-gradient-to-b from-[#e8c660] via-[#d4af37] to-[#8b7124]',
        'text-[#1a1208] shadow-[0_8px_32px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]',
        'transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.4)]',
        'active:translate-y-0 active:scale-[0.97]',
      )}
      style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 bg-gradient-to-t from-black/15 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  );
}

function SecondaryButton({ id, onClick, children, disabled, disabledReason }: ButtonBaseProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      title={disabled ? disabledReason : undefined}
      className={cn(
        'group relative overflow-hidden rounded-xl border px-6 py-4 font-display text-base',
        'bg-gradient-to-b from-[#1a2230] to-[#0b1018]',
        'transition-all duration-150',
        disabled
          ? 'cursor-default border-white/10 text-[var(--color-on-surface-muted)] opacity-60'
          : 'border-[var(--color-treasure)]/40 text-[var(--color-treasure)] shadow-[0_4px_16px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(212,175,55,0.08)] hover:-translate-y-0.5 hover:border-[var(--color-treasure)]/70 active:translate-y-0 active:scale-[0.97]',
      )}
      style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && (
        <span className="absolute inset-0 bg-gradient-to-t from-[var(--color-treasure)]/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </button>
  );
}

function GhostButton({ id, onClick, children }: ButtonBaseProps) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-surface)] px-6 py-3 font-display text-base',
        'text-[var(--color-accent)] transition-all duration-150',
        'hover:border-[var(--color-accent)]/70 hover:bg-[var(--color-surface-solid)]/80',
        'active:scale-[0.97]',
      )}
      style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}
    >
      {children}
    </button>
  );
}

function IconButton({
  onClick,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg',
        'border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-treasure)]',
        'shadow-md backdrop-blur transition-colors',
        'hover:border-[var(--color-treasure)]/60 hover:text-[var(--color-on-surface)]',
        'active:scale-95',
      )}
    >
      {children}
    </button>
  );
}
