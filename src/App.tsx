import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Camera } from 'three';
import { MAP_SIZES } from '@/core/map-size';
import { GameOverModal } from '@/hud/GameOverModal';
import { CriticalWarning } from '@/hud/CriticalWarning';
import { DiscoveriesPanel } from '@/hud/DiscoveriesPanel';
import { KeyboardShortcuts } from '@/hud/KeyboardShortcuts';
import { OnboardingOverlay } from '@/hud/OnboardingOverlay';
import { PauseControl } from '@/hud/PauseControl';
import { SelectionRect } from '@/hud/SelectionRect';
import { ZoneLegend } from '@/hud/ZoneLegend';
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
  const viewport = useViewport();
  // r3f camera ref for HUD overlays that project world → screen (SelectionRect).
  const cameraRef = useRef<Camera | null>(null);
  const getCamera = useCallback(() => cameraRef.current, []);

  return (
    <div id="app-shell" data-viewport={viewport.class} style={{ position: 'absolute', inset: 0 }}>
      <ErrorBoundary fallback={<SceneError />}>
        <GameCanvas
          game={game}
          buildContext={buildContext}
          onCameraReady={(cam) => {
            cameraRef.current = cam;
          }}
        />
      </ErrorBoundary>
      <ResourceBar game={game} compact={viewport.isPortrait} />
      <Minimap game={game} compact={viewport.isPortrait} />
      <SelectionPanel
        game={game}
        onBeginBuild={(ctx) =>
          setBuildContext({ type: ctx.type, onPlaced: () => setBuildContext(null) })
        }
      />
      <SelectionRect game={game} getCamera={getCamera} />
      <SoundToggle persistence={persistence} />
      <PauseControl game={game} />
      <DiscoveriesPanel game={game} />
      <KeyboardShortcuts game={game} />
      <CriticalWarning game={game} />
      <ZoneLegend />
      <OnboardingOverlay persistence={persistence} />
      <GameOverModal game={game} />
    </div>
  );
}

/**
 * Root component. The title screen (New Game / Continue / Settings) precedes
 * the playing phase. The New Game modal mints a fresh event-PRNG seed each
 * time it opens and passes it up on Begin — that seed becomes the committed
 * session's event seed. See `docs/specs/96-prng-and-landing.md`.
 */
export function App() {
  const [config, setConfig] = useState<NewGameConfig | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  // check for an existing committed save (enables the Continue button)
  useEffect(() => {
    void persistence.list().then((saves) => setHasSave(saves.length > 0));
  }, []);

  if (config !== null) {
    return <GameSession config={config} />;
  }

  const beginGame = (choices: NewGameChoices) => {
    setConfig({
      seedPhrase: choices.seedPhrase,
      mapSize: MAP_SIZES[choices.mapSize].radius,
      difficulty: choices.difficulty,
      // the fresh event seed minted by the modal — committed with this session
      eventSeed: choices.eventSeed,
    });
  };

  return (
    <>
      <TitleScreen
        onNewGame={() => setShowNewGame(true)}
        onSettings={() => setShowSettings(true)}
        {...(hasSave
          ? {
              onContinue: () => {
                // resume the most recent committed save
                void persistence.list().then((saves) => {
                  const latest = saves[0];
                  if (latest) {
                    setConfig({
                      seedPhrase: latest.seedPhrase,
                      mapSize: MAP_SIZES.medium.radius,
                      difficulty: 'normal',
                      // a saved session carries its own committed event seed;
                      // until full save-restore lands, derive a stable one
                      // from the save's seed phrase
                      eventSeed: latest.seedPhrase,
                    });
                  }
                });
              },
            }
          : {})}
      />
      <NewGameModal open={showNewGame} onOpenChange={setShowNewGame} onBegin={beginGame} />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} persistence={persistence} />
    </>
  );
}
