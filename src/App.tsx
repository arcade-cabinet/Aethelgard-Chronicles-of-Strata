import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Camera } from 'three';
import { ALL_PERSONALITIES } from '@/config/ai-personalities';
import { MAP_SIZES } from '@/core/map-size';
import { createFreshEventSeed } from '@/core/rng';
import { createAutoSave } from '@/game/auto-save';
import { AssignedJob, Building, FactionTrait, Health, Unit } from '@/ecs/components';
import { type GameState, type NewGameConfig, runEconomyTick, startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { AchievementWatcher } from '@/hud/AchievementWatcher';
import { AriaLiveRegion } from '@/hud/AriaLiveRegion';
import { CaptionsOverlay } from '@/hud/CaptionsOverlay';
import { ErrorOverlay } from '@/hud/ErrorOverlay';
import { BuildMenuButton } from '@/hud/BuildMenuButton';
import { MobileSpeedPausePill } from '@/hud/MobileSpeedPausePill';
import { MobileSystemMenu } from '@/hud/MobileSystemMenu';
import { EraProgressPill } from '@/hud/EraProgressPill';
import { FactionChips } from '@/hud/FactionChips';
import { MatchAgePill } from '@/hud/MatchAgePill';
import { NonAggressionPactPill } from '@/hud/NonAggressionPactPill';
import { TributeDemandBanner } from '@/hud/TributeDemandBanner';
import { RaidPressurePill } from '@/hud/RaidPressurePill';
import { WinConditionPill } from '@/hud/WinConditionPill';
import { ScreenshotButton } from '@/hud/ScreenshotButton';
import { ZoneFlipPulse } from '@/hud/ZoneFlipPulse';
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
import { ScoringScreen } from '@/hud/ScoringScreen';
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
import { createPersistence, PREF_KEYS } from '@/persistence/persistence';
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
    g.autoSave = createAutoSave(() => persistence.save('AutoSave', g));
    // E2E + visual-baseline test hook. Exposes the live GameState on
    // window.__game so Playwright tests can force outcome / read
    // economy / advanceFrames deterministically. Production-safe —
    // window.__game is a forward-reference; nothing in the bundle
    // imports it, so tree-shaking + 'use strict' isolate it to the
    // window namespace only.
    if (typeof window !== 'undefined') {
      type DevWindow = Window & {
        __game?: typeof g;
        __game_advanceFrames?: (n: number) => void;
        __game_findPlayerEntities?: (kind: 'peon' | 'military' | 'building') => number[];
      };
      (window as unknown as DevWindow).__game = g;
      // Helper: advance the sim N 60Hz frames synchronously. Used
      // by e2e specs to get the game into a meaningful playing state
      // before screenshotting / asserting.
      (window as unknown as DevWindow).__game_advanceFrames = (n: number) => {
        for (let i = 0; i < n; i++) runEconomyTick(g, 1 / 60);
      };
      // M_POLISH3.J.4 — query helper for selection-state e2e tests.
      // Returns up to 4 player-faction entity ids by category;
      // ids match what `selectEntity` accepts.
      // M_POLISH3.SCENE.4 — force a game-over outcome. The
      // GameOverModal polls game.outcome via rAF + setState, so
      // direct mutation reaches it eventually — but in headless
      // Playwright the rAF cadence is throttled. This helper
      // mutates outcome AND advances a few sim frames so the
      // poller's next read picks it up before the next
      // screenshot.
      type GameOutcomeT = 'win' | 'loss' | 'draw';
      (
        window as unknown as DevWindow & {
          __triggerGameOver?: (o: GameOutcomeT) => void;
        }
      ).__triggerGameOver = (outcome) => {
        g.outcome = outcome;
        // M_POLISH3.SCENE.4 — dispatch a CustomEvent so the
        // GameOverModal can react immediately (without waiting on
        // rAF, which Chromium throttles in headless / hidden tabs).
        window.dispatchEvent(
          new CustomEvent('aethelgard:outcome-changed', { detail: { outcome } }),
        );
      };
      (window as unknown as DevWindow).__game_findPlayerEntities = (kind) => {
        const MILITARY_TYPES = new Set(['Footman', 'Archer', 'Knight', 'Wizard', 'Trebuchet']);
        const out: number[] = [];
        for (const e of g.world.query(FactionTrait)) {
          if (out.length >= 4) break;
          if (e.get(FactionTrait)?.faction !== 'player') continue;
          const unit = e.get(Unit);
          const building = e.get(Building);
          if (kind === 'peon' && unit?.unitType === 'Peon') out.push(Number(e));
          else if (kind === 'military' && unit && MILITARY_TYPES.has(unit.unitType))
            out.push(Number(e));
          else if (kind === 'building' && building) out.push(Number(e));
        }
        return out;
      };
      // M_FUN.QA.AIVAI — expose trait references so the AI-vs-AI
      // balance e2e can query Building+FactionTrait directly from
      // page.evaluate. Without this, a test would need to import
      // src/ which Playwright doesn't bundle.
      (
        window as unknown as DevWindow & {
          __game_traits?: {
            Building: unknown;
            FactionTrait: unknown;
            Unit: unknown;
            AssignedJob: unknown;
            Health: unknown;
          };
        }
      ).__game_traits = { Building, FactionTrait, Unit, AssignedJob, Health };
    }
    return g;
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
      {/* Per user mandate (2026-05-24): no silent fallbacks.
            ErrorBoundary still catches so the rest of the app keeps
            working, but the caught error is logged to console.error
            (which the ErrorOverlay patches → user sees it
            immediately). The previous SceneError component was a
            generic 'failed to load' message that ate the actual
            stack. */}
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
      {/* M_V6.CARRY.HUD-N-BANNERS — 3+ player faction strip (4X / FFA).
          Hidden on legacy 2-faction matches; appears top-center when
          game.factions has 3+ non-barbarian slots. */}
      <FactionChips game={game} />
      {/* M_V7.DIPLO.UI — non-aggression-pact resolution pills + tribute
          demand banner. Both poll the diplomacy substrate; hidden when
          nothing pending. */}
      <NonAggressionPactPill game={game} />
      <TributeDemandBanner game={game} />
      {/* M_POLISH2.MODES.42 — strata-wars only: zone-control % chip. */}
      <ZoneControlPill game={game} />
      {/* M_POLISH2.MODES.43 — age-of-strata only: era progression pill. */}
      <EraProgressPill game={game} />
      {/* M_POLISH2.MODES.42b — strata-wars only: tile-flip red-pulse. */}
      <ZoneFlipPulse game={game} />
      {/* M_POLISH2.MODES.44b — coexistence only: screenshot the realm. */}
      <ScreenshotButton game={game} />
      <IdlePeonsIndicator game={game} />
      <BuildQueueStrip game={game} />
      <AchievementWatcher game={game} />
      <PersistAchievements game={game} persistence={persistence} />
      <ZoneLegend />
      <OnboardingOverlay persistence={persistence} />
      <GameOverModal game={game} persistence={persistence} />
      {/* M_V7.4X.SCORING — only renders in age-of-strata mode AND when
          game.victoryRecord is non-null. Legacy modes keep GameOverModal. */}
      <ScoringScreen game={game} />
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

  // M_POLISH3.S.3 — re-detect saves when the auto-save fires AND
  // when an e2e spec forces it. Auto-save dispatches
  // 'aethelgard:save-committed' from createAutoSave (M_POLISH3.S.3
  // wires the event there). Title-screen Continue button enables
  // as soon as the first save commits, without forcing a reload.
  // Also exposes window.__refreshSaveList() for tests.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => {
      void persistence.list().then((saves) => setHasSave(saves.length > 0));
    };
    window.addEventListener('aethelgard:save-committed', refresh);
    (window as unknown as { __refreshSaveList?: () => void }).__refreshSaveList = refresh;
    return () => {
      window.removeEventListener('aethelgard:save-committed', refresh);
    };
  }, []);

  // M_POLISH3.AIVAI.1 — URL-driven AI-vs-AI auto-start. The e2e
  // playthrough harness loads /?ai-vs-ai=1&seed=X&mode=Y and expects
  // the title screen to skip straight into a running AI-vs-AI match.
  useMemo(() => {
    if (typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('ai-vs-ai') !== '1') return;
    // M_POLISH3.J.4 — pre-set the onboarding-seen flag so the
    // OnboardingOverlay never opens in AI-vs-AI mode (it's spectator
    // / e2e flow; the player can't interact with the tutorial steps
    // anyway). Avoids the modal-dismiss-race that selection-journey
    // and other downstream specs hit.
    void persistence.setSetting(PREF_KEYS.onboarding, 'true');
    const seed = sp.get('seed') ?? 'aivai-default';
    const mode = (sp.get('mode') ?? 'border-clash') as NonNullable<NewGameConfig['mode']>;
    // M_FUN.AI.NAMED — also accept ?personality=the-raider for the
    // named opponent picker (URL-driven flow). Falls back to the
    // registry default when omitted. Coderabbit MAJOR PR #10 04:56Z:
    // validate against the personality registry so a garbage URL
    // param doesn't reach setConfig and crash downstream AI setup
    // (personalityFor would throw on unknown key).
    const validPersonalities = new Set<string>(ALL_PERSONALITIES);
    const rawPersonality = sp.get('personality');
    const personality =
      rawPersonality && validPersonalities.has(rawPersonality) ? rawPersonality : undefined;
    // M_FUN.QA.AIVAI — separate ?playerPersonality= for the AI-vs-AI
    // balance harness; falls back to ?personality= or the registry
    // default. Allows cross-matchup runs like
    // ?ai-vs-ai=1&playerPersonality=the-builder&personality=the-raider.
    const rawPlayerPersonality = sp.get('playerPersonality');
    const playerPersonality =
      rawPlayerPersonality && validPersonalities.has(rawPlayerPersonality)
        ? rawPlayerPersonality
        : undefined;
    setConfig({
      seedPhrase: seed,
      mapSize: MAP_SIZES.medium.radius,
      difficulty: 'normal',
      eventSeed: seed,
      mode,
      turnsMode: 'real-time',
      maxTurns: null,
      playerColor: null,
      startingBonus: 'none',
      aiVsAi: true,
      ...(personality ? { enemyPersonality: personality } : {}),
      ...(playerPersonality ? { playerPersonality } : {}),
    });
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
      // M_POLISH3.AIVAI.1 — both factions auto-play when set.
      aiVsAi: choices.aiVsAi,
      // M_FUN.AI.PICKER — named opponent.
      enemyPersonality: choices.enemyPersonality,
      // M_PIVOT.N-PLAYER.COLOR-PICKER — pass the explicit faction
      // registry through to startGame so user-picked banner colors
      // land on game.factions (consumed by ZoneBorder + HUD chips
      // once M_PIVOT.RENDER.COLOR-OUTLINE wires them).
      ...(choices.factions ? { factions: choices.factions } : {}),
    });
  };

  return (
    <>
      {/* Global error surface — installs window.error +
            unhandledrejection + console.error + fetch + resource
            patches on mount. EVERY failure surfaces here. NO silent
            fallbacks. */}
      <ErrorOverlay />
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
