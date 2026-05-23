import { motion } from 'framer-motion';
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
}: {
  id: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      id={id}
      onClick={onClick}
      disabled={disabled}
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
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 6, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
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
          {...(onContinue ? {} : { disabled: true })}
        />
        <MenuButton id="menu-settings" label="Settings" onClick={onSettings} />
      </div>

      {/* M_TITLE.3 — version + license row (commercial release) */}
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
          pointerEvents: 'none',
        }}
      >
        v0.2.0 · low-poly assets © Kenney / KayKit (CC0 / CC-BY) · audio © PixelLoops / GameLoops ·
        built with r3f · koota · yuka
      </div>
    </div>
  );
}
