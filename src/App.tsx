import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Camera } from 'three';
import { MAP_SIZES } from '@/core/map-size';
import { createFreshEventSeed } from '@/core/rng';
import { createAutoSave } from '@/game/auto-save';
import { Building, FactionTrait } from '@/ecs/components';
import { type GameState, type NewGameConfig, startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { AchievementWatcher } from '@/hud/AchievementWatcher';
import { AriaLiveRegion } from '@/hud/AriaLiveRegion';
import { CaptionsOverlay } from '@/hud/CaptionsOverlay';
import { BuildMenuButton } from '@/hud/BuildMenuButton';
import { MobileSpeedPausePill } from '@/hud/MobileSpeedPausePill';
import { MobileSystemMenu } from '@/hud/MobileSystemMenu';
import { MatchAgePill } from '@/hud/MatchAgePill';
import { RaidPressurePill } from '@/hud/RaidPressurePill';
import { WinConditionPill } from '@/hud/WinConditionPill';
import { ZoneControlPill } from '@/hud/ZoneControlPill';
import { BuildQueueStrip } from '@/hud/BuildQueueStrip';
import { CriticalWarning } from '@/hud/CriticalWarning';
import { IdlePeonsIndicator } from '@/hud/IdlePeonsIndicator';
import { LoadingScreen } from '@/hud/LoadingScreen';
import { PersistAchievements } from '@/hud/PersistAchievements';
import { ScoreBar } from '@/hud/ScoreBar';
import { SpeedControl } from '@/hud/SpeedControl';
import { WeatherIndicator } from '@/hud/WeatherIndicator';
import { DiscoveriesPanel } from '@/hud/DiscoveriesPanel';
import { EndTurnButton } from '@/hud/EndTurnButton';
import { GameOverModal } from '@/hud/GameOverModal';
import { KeyboardShortcuts } from '@/hud/KeyboardShortcuts';
import { Minimap } from '@/hud/Minimap';
import { type NewGameChoices, NewGameModal } from '@/hud/NewGameModal';
import { OnboardingOverlay } from '@/hud/OnboardingOverlay';
import { PauseControl } from '@/hud/PauseControl';
import { ResignButton } from '@/hud/ResignButton';
import { ResourceBar } from '@/hud/ResourceBar';
import { SelectionPanel } from '@/hud/SelectionPanel';
import { SelectionRect } from '@/hud/SelectionRect';
import { SettingsModal } from '@/hud/SettingsModal';
import { SoundToggle } from '@/hud/SoundToggle';
import { TitleScreen } from '@/hud/TitleScreen';
import { ZoneLegend } from '@/hud/ZoneLegend';
import { createPersistence } from '@/persistence/persistence';
import { deserializeGame } from '@/persistence/serialize-game';
import { ErrorBoundary } from '@/render/ErrorBoundary';
import { GameCanvas } from '@/render/GameCanvas';
import { useViewport } from '@/render/useViewport';
import type { BuildContext } from '@/world/TileInteraction';

/** Shown if the 3D scene fails to load (e.g. a missing asset). */
/**
 * M_AUDIT2.UX.32 — gates the child session mount on a 2-frame
 * delay so the LoadingScreen paints first. Without this, React
 * commits the GameSession (and startGame()'s synchronous terrain
 * gen) in the same frame, the title screen freezes for 1–2s, and
 * the user sees no progress signal.
 */
function DelayedSession({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    // double-rAF: one to commit the LoadingScreen paint, one for
    // the browser to actually flush it before we kick startGame().
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, []);
  return ready ? children : <LoadingScreen />;
}

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

/**
 * The active game session. Accepts either a `config` (new game — fresh
 * startGame call) or a pre-built `initialGame` (resumed from a save —
 * caller has already called deserializeGame).
 */
function GameSession({
  config,
  initialGame,
  onOpenSettings,
}: {
  config?: NewGameConfig;
  initialGame?: GameState;
  /** M_POLISH2.MOBILE.15 — opens the SettingsModal owned by the App root. */
  onOpenSettings?: () => void;
}) {
  const game = useMemo(() => {
    const g = initialGame ?? (config ? startGame(config) : startGame('default'));
    // Attach the 5-minute auto-save — runEconomyTick advances the timer.
    // M_AUDIT2.SEC2.27 reviewer-fix — return the persistence.save
    // promise directly so tickAutoSave's concurrency guard can await
    // it. The previous `void persistence.save(...)` discarded the
    // promise immediately, defeating the saving:bool guard.
    g.autoSave = createAutoSave(() => persistence.save('AutoSave', g));
    return g;
    // initialGame is intentionally a one-shot prop; remounts on config change.
  }, [config, initialGame]);
  const [buildContext, setBuildContext] = useState<BuildContext | null>(null);
  const viewport = useViewport();

  // M_EXPANSION.U.118 — keyboard shortcut bridge. KeyboardShortcuts
  // dispatches a 'aethelgard:trigger-build' CustomEvent for direct
  // building-type pickers (F/H/G/R/T/W keys); App pipes it into the
  // existing buildContext flow.
  useEffect(() => {
    const onTriggerBuild = (e: Event) => {
      const detail = (e as CustomEvent).detail as { type?: BuildContext['type'] } | undefined;
      if (!detail?.type) return;
      setBuildContext({ type: detail.type, onPlaced: () => setBuildContext(null) });
    };
    // M_POLISH2.B.1 — open-build-menu was dispatched by the keyboard
    // shortcut + the new mobile build chip but NOTHING was listening.
    // The listener selects the player's TownHall (which has
    // showsBuildMenu=true) and lets the existing SelectionPanel render
    // the build-button list — re-uses the single source of truth
    // instead of forking a separate build modal.
    const onOpenBuildMenu = () => {
      for (const ent of game.world.query(Building, FactionTrait)) {
        const b = ent.get(Building);
        const f = ent.get(FactionTrait);
        if (b?.buildingType === 'TownHall' && f?.faction === 'player') {
          selectEntity(game, ent);
          break;
        }
      }
    };
    window.addEventListener('aethelgard:trigger-build', onTriggerBuild);
    window.addEventListener('aethelgard:open-build-menu', onOpenBuildMenu);
    return () => {
      window.removeEventListener('aethelgard:trigger-build', onTriggerBuild);
      window.removeEventListener('aethelgard:open-build-menu', onOpenBuildMenu);
    };
  }, [game]);
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
      {/* M_POLISH2.B.2 — portrait suppresses the SoundToggle pill; the
            master mute is reachable via Settings (in the system menu)
            and the new MobileSpeedPausePill already owns the top-
            right slot the SoundToggle used to live in. */}
      {viewport.class !== 'phonePortrait' && <SoundToggle persistence={persistence} />}
      {/* M_POLISH2.B.1 — visible touch-reachable build button.
            Dispatches the open-build-menu event the App listener now
            handles. Mobile-first but useful on desktop too. */}
      <BuildMenuButton />
      {/* M_POLISH2.MOBILE.14 — portrait/phone viewports get the unified
            Speed+Pause pill; everywhere else keeps the two original
            independent controls. PauseControl still mounts on mobile so
            its keyboard P shortcut + the visibilitychange auto-pause
            wiring stay live — but its HudPill is suppressed via the
            viewport check inside HudPill (slot collision avoided by
            simply NOT mounting PauseControl on portrait). */}
      {viewport.class === 'phonePortrait' ? (
        <MobileSpeedPausePill game={game} />
      ) : (
        <>
          <PauseControl game={game} />
          <SpeedControl game={game} />
        </>
      )}
      {/* M_POLISH2.MOBILE.15 — Resign + Settings collapse into a
            single top-left hamburger on portrait phones. ResignButton
            stays mounted on desktop/landscape as its own pill;
            Settings is accessible from the title screen on every
            viewport AND from this menu on portrait. */}
      {viewport.class === 'phonePortrait' ? (
        <MobileSystemMenu game={game} onSettings={() => onOpenSettings?.()} />
      ) : (
        <ResignButton game={game} />
      )}
      <EndTurnButton game={game} />
      <DiscoveriesPanel game={game} />
      <KeyboardShortcuts game={game} />
      <CriticalWarning game={game} />
      <WeatherIndicator game={game} />
      <ScoreBar game={game} />
      {/* M_POLISH2.MODES.39 — per-mode win-condition reminder pill,
            top-centre. Hidden when the game is over (GameOverModal
            takes over the messaging). */}
      <WinConditionPill game={game} />
      {/* M_POLISH2.MODES.40 — frontier-raid only: raid-pressure pill. */}
      <RaidPressurePill game={game} />
      {/* M_POLISH2.MODES.41 — long-reign only: match-age chip. */}
      <MatchAgePill game={game} />
      {/* M_POLISH2.MODES.42 — strata-wars only: zone-control % chip. */}
      <ZoneControlPill game={game} />
      <IdlePeonsIndicator game={game} />
      <BuildQueueStrip game={game} />
      <AchievementWatcher game={game} />
      <PersistAchievements game={game} persistence={persistence} />
      <ZoneLegend />
      <OnboardingOverlay persistence={persistence} />
      <GameOverModal game={game} />
      {/* M_AUDIT2.UX.12 — single hidden aria-live region; the bus
          (src/hud/aria-live-bus.ts) lets any sim event announce
          accessibly without lifting state. */}
      <AriaLiveRegion />
      {/* M_EXPANSION.U.114 — visible captions band for deaf accessibility.
          Renders nothing when captions are off OR when no live captions
          are queued, so the overlay is zero-cost for hearing players. */}
      <CaptionsOverlay />
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
  const [resumedGame, setResumedGame] = useState<GameState | null>(null);
  const [showNewGame, setShowNewGame] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasSave, setHasSave] = useState(false);
  // M_AUDIT2.ARCH.71 — surface save-corruption to the user. The flag
  // flips when persistence.load throws CorruptSaveError; a 10-second
  // auto-dismiss toast tells them their save was lost without
  // hijacking the title screen.
  const [saveCorruptedNotice, setSaveCorruptedNotice] = useState(false);

  // Detect an existing committed save on mount so the Continue button can
  // appear. Re-runs are harmless — persistence.list is a cheap query.
  useMemo(() => {
    void persistence.list().then((saves) => setHasSave(saves.length > 0));
  }, []);

  if (resumedGame !== null) {
    // M_AUDIT2.UX.32 — paint the LoadingScreen for two frames before
    // the GameSession mounts; startGame()'s synchronous terrain gen
    // would otherwise block the first paint and the user sees a
    // 1–2s frozen title screen.
    return (
      <DelayedSession>
        <GameSession initialGame={resumedGame} onOpenSettings={() => setShowSettings(true)} />
      </DelayedSession>
    );
  }
  if (config !== null) {
    return (
      <DelayedSession>
        <GameSession config={config} onOpenSettings={() => setShowSettings(true)} />
      </DelayedSession>
    );
  }

  const beginGame = (choices: NewGameChoices) => {
    setConfig({
      seedPhrase: choices.seedPhrase,
      mapSize: MAP_SIZES[choices.mapSize].radius,
      difficulty: choices.difficulty,
      // the fresh event seed minted by the modal — committed with this session
      eventSeed: choices.eventSeed,
      // M_BRAND.1 — game mode preset (border-clash default).
      mode: choices.mode,
      // M_TURNS.3 — the player's Turn-style override (may differ
      // from the preset's default after the cascade overrides).
      turnsMode: choices.turnsMode,
      // M_TURNS.2 — explicit maxTurns cap. Ignored when turnsMode is
      // real-time. null = uncapped.
      maxTurns: choices.maxTurns,
      // M_EXPANSION.F.80 — player palette pick. null = use SKINS default.
      playerColor: choices.playerColor,
      // M_EXPANSION.F.84 — starting bonus pick. 'none' = baseline.
      startingBonus: choices.startingBonus,
    });
  };

  return (
    <>
      {saveCorruptedNotice && (
        <div
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2000,
            background: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: '0.9rem',
            fontWeight: 600,
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>Your saved game was corrupted and could not be loaded. Starting fresh.</span>
          <button
            type="button"
            aria-label="Dismiss save-corruption notice"
            onClick={() => setSaveCorruptedNotice(false)}
            style={{
              background: 'rgba(0,0,0,0.25)',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '4px 10px',
              cursor: 'pointer',
              fontSize: '0.85rem',
            }}
          >
            Dismiss
          </button>
        </div>
      )}
      <TitleScreen
        onNewGame={() => setShowNewGame(true)}
        onSettings={() => setShowSettings(true)}
        {...(hasSave
          ? {
              onContinue: () => {
                // Resume the most recent committed save via the full
                // game-snapshot path (M_HARDENING.1). deserializeGame
                // rebuilds the deterministic baseline from the snapshot's
                // config then overlays world + economy + clock + weather +
                // research + rally + zones + outcome.
                void persistence.list().then(async (saves) => {
                  const latest = saves[0];
                  if (!latest) return;
                  // M_SEC.22 — load() now throws CorruptSaveError instead
                  // of returning null on corruption; catch separately
                  // from the deserialize step so the user sees a useful
                  // message either way.
                  let record: Awaited<ReturnType<typeof persistence.load>> = null;
                  try {
                    record = await persistence.load(latest.id);
                  } catch (err) {
                    // M_AUDIT2.ARCH.71 — surface the corruption to the
                    // user instead of silently starting fresh.
                    console.warn('[App] save corrupted; starting fresh game', err);
                    setSaveCorruptedNotice(true);
                  }
                  if (!record) return;
                  try {
                    setResumedGame(deserializeGame(record.snapshot));
                  } catch (err) {
                    // M_SEC.7 — resume failed (likely corrupt / tampered
                    // snapshot). DO NOT fall back to a derived event seed
                    // from the map seed (would collapse the two-PRNG model
                    // per spec 96). Mint a fresh event seed instead so the
                    // new game preserves the determinism contract.
                    console.warn('[App] resume failed; starting fresh game', err);
                    setConfig({
                      seedPhrase: record.seedPhrase,
                      mapSize: MAP_SIZES.medium.radius,
                      difficulty: 'normal',
                      eventSeed: createFreshEventSeed(),
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
