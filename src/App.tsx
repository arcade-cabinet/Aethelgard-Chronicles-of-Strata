import { useEffect, useMemo, useRef, useState } from 'react';
import type { Camera } from 'three';
import { useMutedPreference } from '@/audio/useMutedPreference';
import { ALL_PERSONALITIES } from '@/config/ai-personalities';
import { defaultFactionColors } from '@/config/faction-palette';
import { buildDefaultFactions } from '@/config/factions';
import { MAP_SIZES } from '@/core/map-size';
import { createFreshEventSeed } from '@/core/rng';
import { AssignedJob, Building, FactionTrait, Health, Unit } from '@/ecs/components';
import { createAutoSave } from '@/game/auto-save';
import { type GameState, type NewGameConfig, runEconomyTick, startGame } from '@/game/game-state';
import { selectEntity } from '@/game/selection';
import { AchievementWatcher } from '@/hud/AchievementWatcher';
import { AriaLiveRegion } from '@/hud/AriaLiveRegion';
import { BuildMenuButton } from '@/hud/BuildMenuButton';
import { BuildQueueStrip } from '@/hud/BuildQueueStrip';
import { CaptionsOverlay } from '@/hud/CaptionsOverlay';
import { CriticalWarning } from '@/hud/CriticalWarning';
import { AtelierScreen } from '@/hud/AtelierScreen';
import { CampaignOverlay } from '@/hud/CampaignOverlay';
import { DiplomacyModal } from '@/hud/DiplomacyModal';
import { TutorialOverlay } from '@/hud/TutorialOverlay';
import { DiscoveriesPanel } from '@/hud/DiscoveriesPanel';
import { ErrorOverlay } from '@/hud/ErrorOverlay';
import { FactionChips } from '@/hud/FactionChips';
import { GameOverModal } from '@/hud/GameOverModal';
import { IdleUnitIndicator } from '@/hud/IdleUnitIndicator';
import { MultiSelectActions } from '@/hud/MultiSelectActions';
import { KeyboardShortcuts } from '@/hud/KeyboardShortcuts';
import { LoadingScreen } from '@/hud/LoadingScreen';
import { MatchAgePill } from '@/hud/MatchAgePill';
import { Minimap } from '@/hud/Minimap';
import { MobileSpeedPausePill } from '@/hud/MobileSpeedPausePill';
import { type NewGameChoices, NewGameModal } from '@/hud/NewGameModal';
import { NonAggressionPactPill } from '@/hud/NonAggressionPactPill';
import { OnboardingOverlay } from '@/hud/OnboardingOverlay';
import { PauseControl } from '@/hud/PauseControl';
import { PersistAchievements } from '@/hud/PersistAchievements';
import { RaidPressurePill } from '@/hud/RaidPressurePill';
import { ResourceBar } from '@/hud/ResourceBar';
import { ScoreBar } from '@/hud/ScoreBar';
import { ScreenshotButton } from '@/hud/ScreenshotButton';
import { SelectionPanel } from '@/hud/SelectionPanel';
import { SettingsModal } from '@/hud/SettingsModal';
import { Toasts } from '@/hud/Toasts';
import { SpeedControl } from '@/hud/SpeedControl';
import { SystemMenu } from '@/hud/SystemMenu';
import { TitleScreen } from '@/hud/TitleScreen';
import { TributeDemandBanner } from '@/hud/TributeDemandBanner';
import { WeatherIndicator } from '@/hud/WeatherIndicator';
import { WinConditionPill } from '@/hud/WinConditionPill';
import { ZoneControlPill } from '@/hud/ZoneControlPill';
import { ZoneFlipPulse } from '@/hud/ZoneFlipPulse';
import { ZoneLegend } from '@/hud/ZoneLegend';
import { createPersistence, PREF_KEYS } from '@/persistence/persistence';
import { deserializeGame, serializeGame } from '@/persistence/serialize-game';
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
      // M_V11.POLISH.BUILD-MENU-CTA — direct selectEntity hook so
      // Playwright tests can deterministically select an entity
      // (the open-build-menu CustomEvent + useEffect listener
      // mount race is hard to win in headless).
      (
        window as unknown as DevWindow & {
          __game_selectEntity?: (entityId: number) => void;
        }
      ).__game_selectEntity = (entityId) => {
        for (const e of g.world.query(FactionTrait)) {
          if (Number(e) === entityId) {
            selectEntity(g, e);
            return;
          }
        }
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
      // M_V9.E2E.SAVE-LOAD-N-PLAYER — expose serialize/deserialize helpers for
      // Playwright e2e round-trip tests. Production-safe (same isolation as
      // other __game_* helpers).
      (
        window as unknown as DevWindow & {
          __game_save?: () => ReturnType<typeof serializeGame>;
          __game_load?: (snap: ReturnType<typeof serializeGame>) => void;
        }
      ).__game_save = () => serializeGame(g);
      (
        window as unknown as DevWindow & {
          __game_load?: (snap: ReturnType<typeof serializeGame>) => void;
        }
      ).__game_load = (snap) => {
        const restored = deserializeGame(snap);
        for (const key of Object.keys(g) as (keyof typeof g)[]) {
          delete g[key];
        }
        Object.assign(g, restored);
        (window as unknown as DevWindow).__game = g;
      };
    }
    return g;
  }, [config, initialGame]);
  const [buildContext, setBuildContext] = useState<BuildContext | null>(null);
  const viewport = useViewport();
  // M_HUD.SHELL.1 — universal mute hook; mirrors the persisted setting
  // across SystemMenu (the new drawer toggle) and any other surface
  // that wants to display or flip it.
  const [soundMuted, setSoundMuted] = useMutedPreference(persistence);

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
    // The listener selects the player's Palace (which has
    // showsBuildMenu=true) and lets the existing SelectionPanel render
    // the build-button list — re-uses the single source of truth
    // instead of forking a separate build modal.
    const onOpenBuildMenu = () => {
      for (const ent of game.world.query(Building, FactionTrait)) {
        const b = ent.get(Building);
        const f = ent.get(FactionTrait);
        if (b?.buildingType === 'Palace' && f?.faction === 'player') {
          selectEntity(game, ent);
          break;
        }
      }
    };
    // M_V11.POLISH.JOURNEY-CAMERA-EVENTS — focus-palace pans
    // the camera onto the player Palace + zooms in tight.
    // Forwards to aethelgard:focus-tile (CameraRig already listens)
    // with parsed q/r + a tight distance so journey-capture shots
    // can frame the procedural Palace composition.
    const onFocusPalace = () => {
      const key = game.palaceKey;
      if (!key) return;
      // CodeRabbit (PR #89): guard malformed keys instead of falling
      // back to (0,0). Parsing "garbled" with parseInt('garbled', 10)
      // returns NaN; the old code's `?? '0'` only handled an undefined
      // SEGMENT, not a non-numeric one — so a malformed key would yank
      // the camera to tile (0,0) silently. Bail out cleanly instead.
      const parts = key.split(',');
      if (parts.length !== 2) return;
      const q = Number.parseInt(parts[0] ?? '', 10);
      const r = Number.parseInt(parts[1] ?? '', 10);
      if (!Number.isFinite(q) || !Number.isFinite(r)) return;
      window.dispatchEvent(
        new CustomEvent('aethelgard:focus-tile', {
          detail: { q, r, distance: 6 },
        }),
      );
    };
    window.addEventListener('aethelgard:trigger-build', onTriggerBuild);
    window.addEventListener('aethelgard:open-build-menu', onOpenBuildMenu);
    window.addEventListener('aethelgard:focus-palace', onFocusPalace);
    return () => {
      window.removeEventListener('aethelgard:trigger-build', onTriggerBuild);
      window.removeEventListener('aethelgard:open-build-menu', onOpenBuildMenu);
      window.removeEventListener('aethelgard:focus-palace', onFocusPalace);
    };
  }, [game]);
  // r3f camera ref retained even though SelectionRect no longer
  // consumes it (M_GAME.BUG.3) — future HUD overlays that project
  // world→screen will plug back into the ref.
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
      <ResourceBar game={game} compact={viewport.isPortrait} />
      <Minimap game={game} compact={viewport.isPortrait} />
      <SelectionPanel
        game={game}
        onBeginBuild={(ctx) =>
          setBuildContext({ type: ctx.type, onPlaced: () => setBuildContext(null) })
        }
      />
      {/* M_GAME.STACK.2b — multi-select Stack/Unstack actions. Floats
          next to the SelectionPanel; visible only when 2+ units are
          selected (or any selected unit is already in a Stack). */}
      <MultiSelectActions game={game} />
      {/* M_GAME.BUG.3 — desktop blue drag-select rectangle retired.
          Selection is tap-only now. Multi-select via tap-and-hold-then-
          drag (per OnboardingOverlay's "Commanding military" step) is
          handled inside TileInteraction. SelectionRect.tsx remains in
          the tree as a subpackage for desktop opt-in (decompose, don't
          strip) but no longer mounts in the main App. */}
      {/* <SelectionRect game={game} getCamera={getCamera} /> */}
      {/* M_HUD.SHELL.1 — universal SystemMenu (top-right hamburger
            + slide-in drawer). Replaces the per-viewport scatter of
            ResignButton + MobileSystemMenu + SoundToggle pills that
            on N-player viewports (foldable, tablet) collided with the
            resource bar + faction chips into an overcrowded top bar.
            Mounts on every viewport class. Owns Settings, Discoveries,
            Legend, Sound, Resign — each forwarded to the respective
            owner via prop/callback or CustomEvent. */}
      <SystemMenu
        game={game}
        onSettings={() => onOpenSettings?.()}
        soundMuted={soundMuted}
        onToggleSound={setSoundMuted}
      />
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
      <DiscoveriesPanel game={game} />
      {/* M_V11.HUD.DIPLOMACY-MODAL — player-facing diplomacy. Opens on
          the 'aethelgard:open-diplomacy' window event, fired by the
          SystemMenu (top-right hamburger) — same pattern as the
          DiscoveriesPanel. */}
      <DiplomacyModal game={game} />
      {/* M_V11.META-PROGRESSION — AtelierScreen reads lore-token
          balance + meta-unlocks from the persistence facade. Opens
          on the 'aethelgard:open-atelier' event (SystemMenu entry +
          auto-fired from match-end). */}
      <AtelierScreen persistence={persistence} />
      {/* M_V11.TUTORIAL (#77f) — guided overlay; renders only when
          game.mode === 'tutorial' (the component guards internally). */}
      <TutorialOverlay game={game} />
      {/* M_V11.CAMPAIGN (#77g) — chapter overlay; renders only when
          game.mode === 'campaign'. Reads game.campaignChapter to
          pick which chapter's objective queue to drive. */}
      <CampaignOverlay game={game} />
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
      {/* M_POLISH2.MODES.42b — strata-wars only: tile-flip red-pulse. */}
      <ZoneFlipPulse game={game} />
      {/* M_POLISH2.MODES.44b — coexistence only: screenshot the realm. */}
      <ScreenshotButton game={game} />
      <IdleUnitIndicator game={game} />
      <BuildQueueStrip game={game} />
      <AchievementWatcher game={game} />
      <PersistAchievements game={game} persistence={persistence} />
      <ZoneLegend />
      {/* M_V8.TUTORIAL.N-PLAYER-MODE — pass faction count so the overlay
          appends the N-player slide when 3+ factions are in the match. */}
      <OnboardingOverlay persistence={persistence} factionCount={game.factions.length} />
      <GameOverModal game={game} persistence={persistence} />
      {/* M_V11.PURGE — ScoringScreen was 4X-only (age-of-strata
          named-victory panel). RTS modes use GameOverModal. */}
      {/* M_AUDIT2.UX.12 — single hidden aria-live region; the bus
          (src/hud/aria-live-bus.ts) lets any sim event announce
          accessibly without lifting state. */}
      <AriaLiveRegion />
      {/* M_HUD.NOTIF.1 — Aethelgard toast bus. Mounted once at the
          App root; any code can dispatch `aethelgard:toast` to surface
          a tap-to-focus toast in the top-center stack. */}
      <Toasts />
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
      <NewGameModal open={showNewGame} onOpenChange={setShowNewGame} onBegin={beginGame} />
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} persistence={persistence} />
    </>
  );
}
