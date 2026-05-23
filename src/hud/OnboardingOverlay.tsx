import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { type Persistence, safePersistenceRead } from '@/persistence/persistence';
import { HUD_THEME } from './hud-theme';

/** Preferences key that marks the tutorial as seen. */
const ONBOARDING_KEY = 'onboardingSeen';

/** One step of the tutorial — a heading + a one-paragraph teaching. */
interface Step {
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    title: 'Welcome to Aethelgard',
    body: "You command a kingdom on a hex-tile island. The enemy commands one too. The first to raze the other's base wins. Watch your peons auto-harvest; the resources you see at the top fund your buildings.",
  },
  {
    title: 'Peons are autonomous',
    body: "Your peons find the nearest resource in your zone of control and harvest it. They never need orders — and they're nonviolent. As they exploit tiles, your zone of control (the blue border) grows.",
  },
  {
    title: 'Build to grow',
    body: 'Tap your Town Hall to open the build menu. Farms raise your supply, Houses raise the peon cap, Barracks train Footmen, Watchtowers shoot intruders, Walls block enemy pathing. Each building also extends your zone.',
  },
  {
    title: 'Defend the border',
    body: 'If an enemy military unit steps onto a tile YOU control, it pulses yellow. Send a Footman to defend it before the pulse expires — otherwise the tile flips to the enemy. Lose your Town Hall and you lose.',
  },
];

/**
 * First-run tutorial overlay (M9.1c). Radix Dialog (modal, escape-blocked
 * until acknowledged) explaining the core loop in 4 short steps. Skippable
 * up-front; either way, a Preferences flag (`onboardingSeen`) ensures it
 * shows ONLY ONCE. Driven entirely by the persistence facade — no game state.
 */
export function OnboardingOverlay({ persistence }: { persistence: Persistence }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    // M_MICRO.B.1 — safer fallback: show the overlay if the read fails
    // (the player sees onboarding once vs. never). safePersistenceRead
    // owns the try/catch; this call site just describes the parse +
    // fallback intent.
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

  const markSeen = () => {
    setOpen(false);
    persistence.setSetting(ONBOARDING_KEY, 'true').catch((err) => {
      // Persistence write failed — the overlay will show again next session.
      // Acceptable degradation; the player can dismiss it again.
      console.warn('[OnboardingOverlay] setSetting failed:', err);
    });
  };

  const next = () => {
    if (step + 1 >= STEPS.length) markSeen();
    else setStep(step + 1);
  };

  const current = STEPS[step] ?? STEPS[0];
  if (!current) return null;

  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.85)', zIndex: 900 }}
        />
        <Dialog.Content
          id="onboarding-overlay"
          aria-describedby={undefined}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: HUD_THEME.color.panel,
            border: `2px solid ${HUD_THEME.color.border}`,
            borderRadius: 18,
            padding: 28,
            maxWidth: 420,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            zIndex: 901,
          }}
        >
          <Dialog.Title
            style={{
              fontFamily: HUD_THEME.font.display,
              fontSize: '1.4rem',
              fontWeight: 700,
              color: HUD_THEME.color.gold,
              margin: '0 0 10px',
            }}
          >
            {current.title}
          </Dialog.Title>
          <p style={{ fontSize: '0.86rem', lineHeight: 1.5, color: HUD_THEME.color.muted }}>
            {current.body}
          </p>
          <div
            style={{
              marginTop: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ color: HUD_THEME.color.muted, fontSize: '0.72rem' }}>
              {step + 1} / {STEPS.length}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={markSeen}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${HUD_THEME.color.border}`,
                  background: 'transparent',
                  color: HUD_THEME.color.muted,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                }}
              >
                Skip
              </button>
              <button
                id="onboarding-next"
                type="button"
                onClick={next}
                style={{
                  padding: '6px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: HUD_THEME.blueGradient,
                  color: '#fff',
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {step + 1 >= STEPS.length ? 'Begin' : 'Next'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
