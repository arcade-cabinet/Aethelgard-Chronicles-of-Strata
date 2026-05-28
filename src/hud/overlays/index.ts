/**
 * hud/overlays — full-bleed / non-panel HUD surfaces
 * (M_V13.DECOMP.HUD-OVERLAYS).
 *
 * Everything that paints over the board rather than docking as a
 * panel: the mode-gated overlays (tutorial / campaign / wave-defense /
 * onboarding), the boot + title surfaces (loading screen, title screen
 * + animated background), the error overlay, and the accessibility /
 * notification singletons (captions band, aria-live region, toast bus,
 * critical-warning + tribute banners).
 */
export { TutorialOverlay } from './TutorialOverlay';
export { CampaignOverlay } from './CampaignOverlay';
export { WaveDefenseOverlay } from './WaveDefenseOverlay';
export { OnboardingOverlay, STEPS, N_PLAYER_STEP } from './OnboardingOverlay';
export { LoadingScreen } from './LoadingScreen';
export { TitleScreen } from './TitleScreen';
export { TitleBackground } from './TitleBackground';
export { ErrorOverlay, installErrorOverlayHooks } from './ErrorOverlay';
export { CaptionsOverlay } from './CaptionsOverlay';
export { CriticalWarning } from './CriticalWarning';
export { AriaLiveRegion } from './AriaLiveRegion';
export { Toasts, emitToast } from './Toasts';
export { TributeDemandBanner } from './TributeDemandBanner';
