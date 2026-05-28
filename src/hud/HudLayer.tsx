/**
 * HudLayer — the full HUD-overlay mount wall, extracted from
 * App.tsx's GameSession (M_V13.DECOMP.APP-HUDLAYER).
 *
 * GameSession previously inlined ~30 HUD component mounts directly in
 * its JSX, which is why App.tsx had ballooned past 770 lines. This
 * component owns the entire HUD overlay: resource bar, minimap,
 * selection surfaces, system menu, pills, modals, overlays, and the
 * accessibility/notification singletons. GameSession now renders the
 * canvas + a single <HudLayer/>.
 *
 * Pointer-events discipline (renderer stays raycast-pickable): each
 * HUD surface manages its own `pointer-events-auto` panel inside a
 * `pointer-events-none` wrapper — the components handle this
 * individually, exactly as they did when mounted inline.
 */
import type { GameState } from '@/game/game-state';
import type { Persistence } from '@/persistence/persistence';
import type { ViewportProfile } from '@/render/useViewport';
import type { BuildContext } from '@/world/TileInteraction';
import { AchievementWatcher } from '@/hud/AchievementWatcher';
import { AriaLiveRegion } from '@/hud/AriaLiveRegion';
import { AtelierScreen } from '@/hud/AtelierScreen';
import { BuildMenuButton } from '@/hud/BuildMenuButton';
import { BuildQueueStrip } from '@/hud/BuildQueueStrip';
import { CampaignOverlay } from '@/hud/CampaignOverlay';
import { CaptionsOverlay } from '@/hud/CaptionsOverlay';
import { CriticalWarning } from '@/hud/CriticalWarning';
import { DiplomacyModal } from '@/hud/DiplomacyModal';
import { DiscoveriesPanel } from '@/hud/DiscoveriesPanel';
import { GameOverModal } from '@/hud/GameOverModal';
import { IdleUnitIndicator } from '@/hud/IdleUnitIndicator';
import { KeyboardShortcuts } from '@/hud/KeyboardShortcuts';
import { Minimap } from '@/hud/Minimap';
import { MultiSelectActions } from '@/hud/MultiSelectActions';
import { OnboardingOverlay } from '@/hud/OnboardingOverlay';
import { PauseControl } from '@/hud/PauseControl';
import { PersistAchievements } from '@/hud/PersistAchievements';
import {
  FactionChips,
  MatchAgePill,
  MobileSpeedPausePill,
  NonAggressionPactPill,
  RaidPressurePill,
  ScoreBar,
  WeatherIndicator,
  WinConditionPill,
  ZoneControlPill,
  ZoneFlipPulse,
} from '@/hud/pills';
import { ResourceBar } from '@/hud/ResourceBar';
import { ScreenshotButton } from '@/hud/ScreenshotButton';
import { SelectionPanel } from '@/hud/SelectionPanel';
import { SpeedControl } from '@/hud/SpeedControl';
import { SystemMenu } from '@/hud/SystemMenu';
import { Toasts } from '@/hud/Toasts';
import { TributeDemandBanner } from '@/hud/TributeDemandBanner';
import { TutorialOverlay } from '@/hud/TutorialOverlay';
import { WaveDefenseOverlay } from '@/hud/WaveDefenseOverlay';
import { ZoneLegend } from '@/hud/ZoneLegend';

export interface HudLayerProps {
  game: GameState;
  viewport: ViewportProfile;
  persistence: Persistence;
  soundMuted: boolean;
  setSoundMuted: (muted: boolean) => void;
  /** Open the App-root SettingsModal (owned above GameSession). */
  onOpenSettings?: (() => void) | undefined;
  /** Begin a build placement; GameSession owns the buildContext state. */
  onBeginBuild: (ctx: BuildContext) => void;
}

export function HudLayer({
  game,
  viewport,
  persistence,
  soundMuted,
  setSoundMuted,
  onOpenSettings,
  onBeginBuild,
}: HudLayerProps) {
  return (
    <>
      <ResourceBar game={game} compact={viewport.isPortrait} />
      <Minimap game={game} compact={viewport.isPortrait} />
      <SelectionPanel game={game} onBeginBuild={onBeginBuild} />
      {/* M_GAME.STACK.2b — multi-select Stack/Unstack actions. */}
      <MultiSelectActions game={game} />
      {/* M_HUD.SHELL.1 — universal SystemMenu (top-right hamburger). */}
      <SystemMenu
        game={game}
        onSettings={() => onOpenSettings?.()}
        soundMuted={soundMuted}
        onToggleSound={setSoundMuted}
      />
      {/* M_POLISH2.B.1 — visible touch-reachable build button. */}
      <BuildMenuButton />
      {/* M_POLISH2.MOBILE.14 — portrait gets the unified Speed+Pause pill;
          everywhere else keeps the two independent controls. */}
      {viewport.class === 'phonePortrait' ? (
        <MobileSpeedPausePill game={game} />
      ) : (
        <>
          <PauseControl game={game} />
          <SpeedControl game={game} />
        </>
      )}
      <DiscoveriesPanel game={game} />
      {/* M_V11.HUD.DIPLOMACY-MODAL — player-facing diplomacy. */}
      <DiplomacyModal game={game} />
      {/* M_V11.META-PROGRESSION — Atelier reads lore tokens + unlocks. */}
      <AtelierScreen persistence={persistence} />
      {/* M_V11.TUTORIAL/CAMPAIGN/WAVE-DEFENSE — mode-gated overlays. */}
      <TutorialOverlay game={game} />
      <CampaignOverlay game={game} />
      <WaveDefenseOverlay game={game} />
      <KeyboardShortcuts game={game} />
      <CriticalWarning game={game} />
      <WeatherIndicator game={game} />
      <ScoreBar game={game} />
      {/* M_POLISH2.MODES.39-44 — per-mode pills (component-gated). */}
      <WinConditionPill game={game} />
      <RaidPressurePill game={game} />
      <MatchAgePill game={game} />
      {/* M_V6.CARRY.HUD-N-BANNERS — 3+ player faction strip. */}
      <FactionChips game={game} />
      {/* M_V7.DIPLO.UI — pact + tribute surfaces (poll-gated). */}
      <NonAggressionPactPill game={game} />
      <TributeDemandBanner game={game} />
      <ZoneControlPill game={game} />
      <ZoneFlipPulse game={game} />
      {/* M_POLISH2.MODES.44b — coexistence only: screenshot the realm. */}
      <ScreenshotButton game={game} />
      <IdleUnitIndicator game={game} />
      <BuildQueueStrip game={game} />
      <AchievementWatcher game={game} />
      <PersistAchievements game={game} persistence={persistence} />
      <ZoneLegend />
      <OnboardingOverlay persistence={persistence} factionCount={game.factions.length} />
      <GameOverModal game={game} persistence={persistence} />
      {/* M_AUDIT2.UX.12 — single hidden aria-live region. */}
      <AriaLiveRegion />
      {/* M_HUD.NOTIF.1 — toast bus mounted once. */}
      <Toasts />
      {/* M_EXPANSION.U.114 — captions band for deaf accessibility. */}
      <CaptionsOverlay />
    </>
  );
}
