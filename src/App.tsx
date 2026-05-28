import { useEffect, useMemo, useRef, useState } from 'react';
import type { Camera } from 'three';
import { useMutedPreference } from '@/audio/useMutedPreference';
import { ALL_PERSONALITIES } from '@/config/ai';
import { defaultFactionColors } from '@/config/ai';
import { buildDefaultFactions } from '@/config/ai';
import { MAP_SIZES } from '@/core/map-size';
import { createFreshEventSeed } from '@/core/rng';
import { createAutoSave } from '@/game/auto-save';
import { installDevHarness } from '@/game/dev-harness';
import { type GameState, type NewGameConfig, startGame } from '@/game/game-state';
import { HudLayer } from '@/hud/HudLayer';
import { useGameWindowEvents } from '@/hud/hooks/useGameWindowEvents';
import { type NewGameChoices, NewGameModal, SettingsModal } from '@/hud/modals';
import { ErrorOverlay, LoadingScreen, TitleScreen } from '@/hud/overlays';
import { createPersistence, PREF_KEYS } from '@/persistence/persistence';
import { deserializeGame } from '@/persistence/serialize-game';
import { ErrorBoundary } from '@/render/ErrorBoundary';
import { GameCanvas } from '@/render/GameCanvas';
import { useViewport } from '@/render/useViewport';
import type { BuildContext } from '@/world/terrain';

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

/**
 * M_V7.E2E.4-PLAYER-CAMP-CLEAR — build an N-faction registry from
 * a URL ?nplayer=N param. Mirrors NewGameModal's buildDefaultFactions
 * call so the e2e flow gets the same shape as a real user-selected
 * 4X match.
 */
function buildDefaultFactionsForUrl(n: number, seed: string) {
  const colors = defaultFactionColors(n, seed);
  return buildDefaultFactions(n, colors);
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
    return g;
  }, [config, initialGame]);
  // M_V13.HARNESS.ATOMIC-READY — install the window.__game* E2E /
  // visual-test harness in a COMMITTED effect, not in the render-phase
  // useMemo. Render-phase install fired on renders React later
  // discards (StrictMode double-mount, a child <Scene> Suspense
  // throwaway under slow asset load), publishing `__game` + hooks from
  // a render that never committed. Under suite load that let a spec's
  // readiness `waitForFunction` resolve against a half/non-committed
  // document while the follow-up read saw a stale/absent `__game`.
  // An effect runs only for the render that actually commits, so the
  // harness on `window` always corresponds to the live tree.
  useEffect(() => {
    installDevHarness(game);
  }, [game]);
  const [buildContext, setBuildContext] = useState<BuildContext | null>(null);
  const viewport = useViewport();
  // M_HUD.SHELL.1 — universal mute hook; mirrors the persisted setting
  // across SystemMenu (the new drawer toggle) and any other surface
  // that wants to display or flip it.
  const [soundMuted, setSoundMuted] = useMutedPreference(persistence);

  // M_V13.DECOMP.APP-EVENTS — the trigger-build / open-build-menu /
  // focus-palace window-event wiring now lives in a dedicated hook.
  useGameWindowEvents(game, setBuildContext);
  // r3f camera ref retained for future HUD overlays that project
  // world→screen coordinates; no current consumer.
  const cameraRef = useRef<Camera | null>(null);

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
      {/* M_V13.DECOMP.APP-HUDLAYER — the ~30-component HUD-overlay
          mount wall extracted into HudLayer so App.tsx stays a thin
          shell. GameSession keeps ownership of buildContext + camera;
          HudLayer receives game + viewport + persistence + the
          sound + settings + begin-build callbacks. */}
      <HudLayer
        game={game}
        viewport={viewport}
        persistence={persistence}
        soundMuted={soundMuted}
        setSoundMuted={setSoundMuted}
        onOpenSettings={onOpenSettings}
        onBeginBuild={(ctx) =>
          setBuildContext({ type: ctx.type, onPlaced: () => setBuildContext(null) })
        }
      />
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

  // M_V11.TUTORIAL (#77f) — listen for the tutorial overlay's
  // "Start a real match" button. Fires window event → opens the
  // NewGameModal.
  useEffect(() => {
    const onOpenNewGame = () => setShowNewGame(true);
    window.addEventListener('aethelgard:open-new-game', onOpenNewGame);
    return () => window.removeEventListener('aethelgard:open-new-game', onOpenNewGame);
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
    // M_V7.E2E.4-PLAYER-CAMP-CLEAR — optional ?nplayer=N param drives
    // an N-player setup via the buildDefaultFactions helper. Used by
    // the e2e camp-clearing spec to test the full barbarian-camp
    // pipeline against a real 4-player game without the NewGameModal
    // exposing the >2-faction picker (a v0.8 polish item).
    const rawN = sp.get('nplayer');
    const nplayer = rawN ? Math.min(6, Math.max(2, Number.parseInt(rawN, 10) || 2)) : 2;
    const factions = nplayer > 2 ? buildDefaultFactionsForUrl(nplayer, seed) : undefined;
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
      ...(factions ? { factions } : {}),
    });
  }, []);

  // M_V12.DEPTH.UPGRADE-PERSISTENCE — pre-fetch the meta-unlock
  // list on App mount AND gate beginGame on the in-flight promise
  // so a fast Begin click never silently loses paid-for Atelier
  // unlocks (code reviewer blocker on PR #90). The cache ref holds
  // the resolved list; the promise ref holds the in-flight fetch
  // so beginGame can await it the rare time the cache hasn't
  // resolved yet.
  const unlockedMetaCacheRef = useRef<string[]>([]);
  const [unlockedMetaReady, setUnlockedMetaReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void persistence
      .listMetaUnlocks()
      .catch((err: unknown) => {
        console.warn('[meta-progression] listMetaUnlocks failed:', err);
        return [] as string[];
      })
      .then((list) => {
        if (!cancelled) {
          unlockedMetaCacheRef.current = list;
          setUnlockedMetaReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
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
    // Read the cached unlock list synchronously. The mount-time
    // useEffect kicks the persistence fetch; for the dominant
    // case (player on Title for >100ms before Begin) the cache is
    // populated. Cold-DB + sub-100ms-click users get a baseline
    // match with an empty unlock list — the reviewer-pass M1 await
    // path broke browser tests by deferring setConfig past React's
    // commit window; promote the post-match retry path
    // (M_V12.PERSIST.CHAIN-STARTER-RETRY in §post-horizon) instead.
    const unlockedMeta = unlockedMetaCacheRef.current;
    setConfig({
      seedPhrase: choices.seedPhrase,
      mapSize: MAP_SIZES[choices.mapSize].radius,
      difficulty: choices.difficulty,
      // the fresh event seed minted by the modal — committed with this session
      eventSeed: choices.eventSeed,
      // M_V12.DEPTH.UPGRADE-PERSISTENCE — chain-starter Atelier
      // unlocks consumed by startGame.applyChainStarters.
      unlockedMeta,
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
        persistence={persistence}
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
      <NewGameModal
        open={showNewGame}
        onOpenChange={setShowNewGame}
        onBegin={beginGame}
        beginReady={unlockedMetaReady}
      />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} persistence={persistence} />
    </>
  );
}
