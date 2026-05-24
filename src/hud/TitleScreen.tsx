import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useTitleMusic } from '@/audio/useTitleMusic';
import { CreditsModal } from './CreditsModal';
import { HUD_THEME } from './hud-theme';
import { TitleBackground } from './TitleBackground';

/** Props for the title screen. */
export interface TitleScreenProps {
  /** Open the New Game modal. */
  onNewGame: () => void;
  /** Resume the most recent auto-save. Absent when no save exists. */
  onContinue?: () => void;
  /** Open the Settings modal. */
  onSettings: () => void;
}

/** A title-screen menu button. */
function MenuButton({
  id,
  label,
  onClick,
  primary,
  disabled,
  disabledReason,
}: {
  id: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
  /** M_AUDIT2.UX.20 — when disabled, the title attribute explains why. */
  disabledReason?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-disabled={disabled}
      style={{
        width: 260,
        padding: '14px',
        borderRadius: 12,
        border: primary ? 'none' : `1px solid ${HUD_THEME.color.border}`,
        background: disabled
          ? 'rgba(255,255,255,0.04)'
          : primary
            ? HUD_THEME.blueGradient
            : 'rgba(9,13,22,0.88)',
        color: disabled ? HUD_THEME.color.muted : primary ? '#fff' : HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.display,
        fontSize: '1.05rem',
        cursor: disabled ? 'default' : 'pointer',
        boxShadow: primary ? '0 4px 20px rgba(56,189,248,0.3)' : 'none',
      }}
    >
      {label}
    </button>
  );
}

/**
 * The title screen — the branded landing page. "Aethelgard" in a gold-gradient
 * Metamorphous heading over "Chronicles of Strata", with New Game / Continue /
 * Settings. Continue is shown only when an auto-save exists. Matches poc2's
 * `#launcher` branding.
 */
export function TitleScreen({ onNewGame, onContinue, onSettings }: TitleScreenProps) {
  useTitleMusic();
  // M_AUDIT2.UX.1 — respect prefers-reduced-motion: skip the
  // infinite bob (vestibular-disorder users); keep static layout.
  const reducedMotion = useReducedMotion();
  // M_AUDIT2.SEC2.34 — Credits modal state.
  const [showCredits, setShowCredits] = useState(false);
  return (
    <div
      id="title-screen"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at center, rgba(17,24,39,0.5) 0%, rgba(3,7,18,0.95) 100%)',
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.body,
        padding: 20,
      }}
    >
      <TitleBackground />
      <motion.div
        style={{ textAlign: 'center', marginBottom: 50 }}
        // M_AUDIT2.UX.1 — `animate={false}` disables motion entirely
        // when the user prefers reduced motion.
        animate={reducedMotion ? false : { y: [0, -12, 0] }}
        transition={
          reducedMotion
            ? { duration: 0 }
            : { duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }
        }
      >
        <h1
          id="title-heading"
          style={{
            fontFamily: HUD_THEME.font.display,
            fontSize: '3.6rem',
            margin: 0,
            background: HUD_THEME.goldGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 2,
          }}
        >
          Aethelgard
        </h1>
        <p
          style={{
            fontFamily: HUD_THEME.font.body,
            fontSize: '0.95rem',
            letterSpacing: 4,
            color: HUD_THEME.color.accent,
            textTransform: 'uppercase',
            marginTop: 10,
            fontWeight: 600,
          }}
        >
          Chronicles of Strata
        </p>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <MenuButton id="menu-new-game" label="New Game" onClick={onNewGame} primary />
        <MenuButton
          id="menu-continue"
          label="Continue"
          onClick={onContinue ?? (() => {})}
          {...(onContinue
            ? {}
            : { disabled: true, disabledReason: 'No saved game yet — start a New Game' })}
        />
        <MenuButton id="menu-settings" label="Settings" onClick={onSettings} />
      </div>

      {/* M_TITLE.3 — version + license row (commercial release).
          M_AUDIT2.SEC2.34 — Credits is now a real modal listing every
          bundled asset pack + library; the inline "CC-BY" string was
          inaccurate (every asset is actually CC0 / royalty-free). */}
      <div
        id="title-footer"
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.62rem',
          color: HUD_THEME.color.muted,
          letterSpacing: 0.6,
        }}
      >
        v{typeof __APP_VERSION__ === 'undefined' ? 'dev' : __APP_VERSION__} · built with r3f · koota
        · yuka ·{' '}
        <button
          type="button"
          id="title-credits"
          onClick={() => setShowCredits(true)}
          style={{
            background: 'none',
            border: 'none',
            color: HUD_THEME.color.accent,
            textDecoration: 'underline',
            cursor: 'pointer',
            font: 'inherit',
            padding: 0,
          }}
        >
          Credits
        </button>
      </div>
      <CreditsModal open={showCredits} onOpenChange={setShowCredits} />
    </div>
  );
}
