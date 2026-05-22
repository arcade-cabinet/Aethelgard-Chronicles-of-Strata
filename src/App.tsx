import { useEffect, useMemo, useState } from 'react';
import { createEventPrng } from '@/core/rng';
import { MAP_SIZES } from '@/core/map-size';
import { CreditsPanel } from '@/hud/CreditsPanel';
import { GameOverModal } from '@/hud/GameOverModal';
import { type NewGameChoices, NewGameModal } from '@/hud/NewGameModal';
import { Minimap } from '@/hud/Minimap';
import { ResourceBar } from '@/hud/ResourceBar';
import { SelectionPanel } from '@/hud/SelectionPanel';
import { SettingsModal } from '@/hud/SettingsModal';
import { SoundToggle } from '@/hud/SoundToggle';
import { TitleScreen } from '@/hud/TitleScreen';
import { createPersistence } from '@/persistence/persistence';
import { createAutoSave } from '@/game/auto-save';
import { useViewport } from '@/render/useViewport';
import { ErrorBoundary } from '@/render/ErrorBoundary';
import { GameCanvas } from '@/render/GameCanvas';
import { type NewGameConfig, startGame } from '@/game/game-state';
import type { BuildContext } from '@/world/TileInteraction';

/** Shown if the 3D scene fails to load (e.g. a missing asset). */
function SceneError() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f1f5f9',
        background: '#090d16',
        fontFamily: 'sans-serif',
      }}
    >
      <p>The realm failed to load. Please reload the page.</p>
    </div>
  );
}

/** The persistence facade — created once for the whole app. */
const persistence = createPersistence();

/** The active game session, rendered once a config has been chosen. */
function GameSession({ config }: { config: NewGameConfig }) {
  const game = useMemo(() => {
    const g = startGame(config);
    // Attach the 5-minute auto-save — runEconomyTick advances the timer.
    g.autoSave = createAutoSave(() => {
      void persistence.save('AutoSave', g);
    });
    return g;
  }, [config]);
  const [buildContext, setBuildContext] = useState<BuildContext | null>(null);
  const [showCredits, setShowCredits] = useState(false);
  const viewport = useViewport();

  return (
    <div id="app-shell" data-viewport={viewport.class} style={{ position: 'absolute', inset: 0 }}>
      <ErrorBoundary fallback={<SceneError />}>
        <GameCanvas game={game} buildContext={buildContext} />
      </ErrorBoundary>
      <ResourceBar game={game} compact={viewport.isPortrait} />
      <Minimap game={game} compact={viewport.isPortrait} />
      <SelectionPanel
        game={game}
        onBeginBuild={(ctx) =>
          setBuildContext({ type: ctx.type, onPlaced: () => setBuildContext(null) })
        }
      />
      <SoundToggle persistence={persistence} />
      <GameOverModal game={game} />
      {showCredits && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(3,7,18,0.85)',
            zIndex: 900,
          }}
        >
          <CreditsPanel onClose={() => setShowCredits(false)} />
        </div>
      )}
      <button
        type="button"
        onClick={() => setShowCredits(true)}
        style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '6px 14px',
          borderRadius: 8,
          border: '1px solid rgba(56,189,248,0.28)',
          background: 'rgba(9,13,22,0.88)',
          color: '#94a3b8',
          fontFamily: 'sans-serif',
          fontSize: '0.72rem',
          cursor: 'pointer',
        }}
      >
        Credits
      </button>
    </div>
  );
}

/**
 * Root component. The title screen (New Game / Continue / Settings) precedes
 * the playing phase. New Game collects a seed phrase, map size, and difficulty;
 * the event-PRNG seed is the buried Capacitor Preferences value, advanced once
 * per game. See `docs/specs/96-prng-and-landing.md`.
 */
export function App() {
  const [config, setConfig] = useState<NewGameConfig | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [eventSeed, setEventSeed] = useState<string | null>(null);
  const [hasSave, setHasSave] = useState(false);

  // load the buried event seed and check for an existing auto-save
  useEffect(() => {
    void persistence.getEventSeed().then(setEventSeed);
    void persistence.list().then((saves) => setHasSave(saves.length > 0));
  }, []);

  // the event PRNG used by the New Game modal's seed randomizer
  const eventRng = useMemo(() => createEventPrng(eventSeed ?? 'pending'), [eventSeed]);

  if (config !== null) {
    return <GameSession config={config} />;
  }

  const beginGame = (choices: NewGameChoices) => {
    const seed = eventSeed ?? 'pending';
    setConfig({
      seedPhrase: choices.seedPhrase,
      mapSize: MAP_SIZES[choices.mapSize].radius,
      difficulty: choices.difficulty,
      eventSeed: seed,
    });
    // advance the buried event seed so the next game differs
    void persistence.advanceAndPersistEventSeed(createEventPrng(seed));
  };

  return (
    <>
      <TitleScreen
        onNewGame={() => setShowNewGame(true)}
        onSettings={() => setShowSettings(true)}
        {...(hasSave
          ? {
              onContinue: () => {
                // resume the most recent auto-save
                void persistence.list().then((saves) => {
                  const latest = saves[0];
                  if (latest) {
                    setConfig({
                      seedPhrase: latest.seedPhrase,
                      mapSize: MAP_SIZES.medium.radius,
                      difficulty: 'normal',
                      eventSeed: eventSeed ?? 'pending',
                    });
                  }
                });
              },
            }
          : {})}
      />
      <NewGameModal
        open={showNewGame}
        onOpenChange={setShowNewGame}
        eventRng={eventRng}
        onBegin={beginGame}
      />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} persistence={persistence} />
    </>
  );
}
