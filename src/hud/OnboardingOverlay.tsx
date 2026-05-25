import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { type Persistence, PREF_KEYS, safePersistenceRead } from '@/persistence/persistence';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';

/** Preferences key that marks the tutorial as seen. */
// M_SEC.33 — Preferences keys are namespaced via the PREF_KEYS enum.
const ONBOARDING_KEY = PREF_KEYS.onboarding;

/** One step of the tutorial — a heading + a one-paragraph teaching. */
interface Step {
  title: string;
  body: string;
}

// M_AUDIT2.UX.21 — extended from 4 → 9 steps. The original four
// covered the core loop but skipped right-click move orders,
// drag-select, pause/keyboard shortcuts, the resource legend, and
// per-mode win conditions. New players were running into all of
// these blind.
// M_POLISH2.MOBILE.12a — touch-first copy. Replaces the
// desktop-mouse-instruction body text ("RIGHT-CLICK any tile…",
// "click-drag a rectangle…") with tap / long-press / pinch /
// drag-pan gestures that work on every viewport.
const STEPS: Step[] = [
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

/** N-player slide content. */
const N_PLAYER_STEP: Step = {
  title: 'Multiple factions',
  body: 'Multiple factions have joined the map. Build your economy, form alliances, and be the last faction standing. Use the diplomacy panel to propose non-aggression pacts or demand tribute from weaker rivals.',
};

/**
 * First-run tutorial overlay (M9.1c). Radix Dialog (modal, escape-blocked
 * until acknowledged) explaining the core loop in 4 short steps. Skippable
 * up-front; either way, a Preferences flag (`onboardingSeen`) ensures it
 * shows ONLY ONCE. Driven entirely by the persistence facade — no game state.
 *
 * M_V8.TUTORIAL.N-PLAYER-MODE — when `factionCount > 2`, appends a
 * dedicated N-player slide after the main sequence.
 */
export function OnboardingOverlay({
  persistence,
  factionCount = 2,
}: {
  persistence: Persistence;
  /** M_V8.TUTORIAL.N-PLAYER-MODE — number of active factions. */
  factionCount?: number;
}) {
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

  // M_POLISH3.SCENE.3 — e2e/dev hook to dismiss the onboarding overlay
  // without 9 click-throughs. Tests + journey-capture screenshots need
  // a clean canvas; this is the documented way to bypass the tutorial.
  // Sets the persistence flag too so subsequent reloads don't re-show.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    type DevWindow = Window & { __skipOnboarding?: () => Promise<void> };
    (window as unknown as DevWindow).__skipOnboarding = async () => {
      setOpen(false);
      await persistence.setSetting(ONBOARDING_KEY, 'true');
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

  // M_V8.TUTORIAL.N-PLAYER-MODE — append the N-player slide for 3+
  // faction matches, shown after the existing sequence.
  const steps = factionCount > 2 ? [...STEPS, N_PLAYER_STEP] : STEPS;

  const next = () => {
    if (step + 1 >= steps.length) markSeen();
    else setStep(step + 1);
  };

  const current = steps[step] ?? steps[0];
  if (!current) return null;

  return (
    <Dialog.Root open={open}>
      {/* M_MICRO.10.1 — onboarding is a tutorial that the player must
          step through; blockClose=true so accidental click-outside
          doesn't skip it. */}
      <ModalShell
        contentId="onboarding-overlay"
        zIndex={900}
        width="auto"
        maxHeight="none"
        blockClose
        contentStyle={{
          borderRadius: 18,
          padding: 28,
          maxWidth: 420,
          fontFamily: HUD_THEME.font.body,
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
          <span style={{ color: HUD_THEME.color.muted, fontSize: '0.78rem' }}>
            {step + 1} / {steps.length}
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
              {step + 1 >= steps.length ? 'Begin' : 'Next'}
            </button>
          </div>
        </div>
      </ModalShell>
    </Dialog.Root>
  );
}
