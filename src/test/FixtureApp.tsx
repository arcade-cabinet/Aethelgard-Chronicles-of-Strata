/**
 * FixtureApp — M_HUD.SHELL.13.
 *
 * Renders a SINGLE Aethelgard screen in isolation, with mocked props,
 * driven by the `?fixture=<name>` URL param. Used by the visual
 * fixture battery (`scripts/capture-aethelgard-fixtures.mjs`) so each
 * screen can be screenshotted without driving the full launcher →
 * setup → onboarding → match flow.
 *
 * Pattern modelled on `~/src/arcade-cabinet/mean-streets/src/test/FixtureApp.tsx`.
 *
 * Fixture names + their target screens:
 *
 *   title            → TitleScreen (launcher)
 *   newgame          → NewGameModal open over a darkened bg
 *   onboarding       → OnboardingOverlay step 1 over a darkened bg
 *   gameover-win     → GameOverModal in 'win' outcome
 *   gameover-loss    → GameOverModal in 'loss' outcome
 *   gameover-draw    → GameOverModal in 'draw' outcome
 *   system-menu      → SystemMenu drawer open
 */
import { useEffect, useState } from 'react';
import { CreditsModal } from '@/hud/CreditsModal';
import { GameOverModal } from '@/hud/GameOverModal';
import { NewGameModal } from '@/hud/NewGameModal';
import { OnboardingOverlay } from '@/hud/OnboardingOverlay';
import { SettingsModal } from '@/hud/SettingsModal';
import { SystemMenu } from '@/hud/SystemMenu';
import { TitleScreen } from '@/hud/TitleScreen';
import { startGame } from '@/game/game-state';
import { createPersistence } from '@/persistence/persistence';

const persistence = createPersistence();

/** A no-op screen background so modals have something to overlay. */
function DimBackdrop({ label }: { label: string }) {
  return (
    <div
      data-testid="fixture-root"
      className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-on-surface-muted)]"
    >
      <span className="text-xs uppercase tracking-[0.4em] opacity-30">{label}</span>
    </div>
  );
}

export interface FixtureAppProps {
  fixture: string;
}

export function FixtureApp({ fixture }: FixtureAppProps) {
  const [openSettings, setOpenSettings] = useState(false);
  const [openCredits, setOpenCredits] = useState(false);

  // Clear the onboarding-seen flag for the 'onboarding' fixture so the
  // overlay actually opens.
  useEffect(() => {
    if (fixture === 'onboarding') {
      void persistence.setSetting('aethelgard.onboardingSeen', '');
    }
  }, [fixture]);

  switch (fixture) {
    case 'title':
      return (
        <div data-testid="fixture-root">
          <TitleScreen
            persistence={persistence}
            onNewGame={() => undefined}
            onSettings={() => setOpenSettings(true)}
          />
          <SettingsModal
            open={openSettings}
            onOpenChange={setOpenSettings}
            persistence={persistence}
          />
          <CreditsModal open={openCredits} onOpenChange={setOpenCredits} />
        </div>
      );

    case 'newgame':
      return (
        <>
          <DimBackdrop label="New Game Setup" />
          <NewGameModal
            open
            onOpenChange={() => undefined}
            onBegin={() => undefined}
          />
        </>
      );

    case 'onboarding': {
      const fakeGame = startGame('fixture-onboarding');
      return (
        <>
          <DimBackdrop label="Onboarding Step 1" />
          <OnboardingOverlay persistence={persistence} factionCount={fakeGame.factions.length} />
        </>
      );
    }

    case 'gameover-win':
    case 'gameover-loss':
    case 'gameover-draw': {
      const game = startGame('fixture-gameover');
      const outcome =
        fixture === 'gameover-win' ? 'win' : fixture === 'gameover-loss' ? 'loss' : 'draw';
      game.outcome = outcome;
      game.victoryRecord = {
        kind: 'military',
        winner: outcome === 'win' ? 'player' : 'enemy',
        detectedAtSeconds: 300,
      };
      return (
        <>
          <DimBackdrop label={`Game Over — ${outcome}`} />
          <GameOverModal game={game} persistence={persistence} />
        </>
      );
    }

    case 'system-menu': {
      const game = startGame('fixture-system-menu');
      return (
        <>
          <DimBackdrop label="System Menu Drawer" />
          <SystemMenu
            game={game}
            onSettings={() => setOpenSettings(true)}
            soundMuted={false}
            onToggleSound={() => undefined}
          />
        </>
      );
    }

    default:
      return (
        <div
          data-testid="fixture-root"
          className="fixed inset-0 flex items-center justify-center bg-[var(--color-bg)] text-[var(--color-on-surface)]"
        >
          <p>
            Unknown fixture: <code>{fixture}</code>
          </p>
        </div>
      );
  }
}
