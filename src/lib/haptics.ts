/**
 * M_FUN.PHONE.HAPTIC — Capacitor Haptics gateway.
 *
 * Web environment is a no-op (Capacitor stub returns Promise.resolve()).
 * Android device fires the configured impact via the system haptics
 * channel. Future Settings opt-out lands when the SettingsModal
 * gains a haptic toggle.
 *
 * Game callsites pick a SEMANTIC trigger (`buildComplete`, `unitKilled`,
 * `quake`, `wildfireIgnition`) — the strength mapping is here, so the
 * caller never imports Haptics directly.
 */
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/** True when haptics should fire — gated by user opt-in (Settings). */
let enabled = true;

/** Setter for the Settings toggle. */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function isHapticsEnabled(): boolean {
  return enabled;
}

async function safeImpact(style: ImpactStyle): Promise<void> {
  if (!enabled) return;
  try {
    await Haptics.impact({ style });
  } catch {
    // Stub on web; intentional no-op. Errors logged in a future
    // observability pass once setObservabilityOptIn lands.
  }
}

/** Build completed — heavy thunk. */
export function hapticBuildComplete(): Promise<void> {
  return safeImpact(ImpactStyle.Heavy);
}

/** Unit killed — medium thump. */
export function hapticUnitKilled(): Promise<void> {
  return safeImpact(ImpactStyle.Medium);
}

/** Quake fires — heavy with implicit-decay (caller may invoke multiple). */
export function hapticQuake(): Promise<void> {
  return safeImpact(ImpactStyle.Heavy);
}

/** Wildfire ignition — light tap. */
export function hapticWildfireIgnition(): Promise<void> {
  return safeImpact(ImpactStyle.Light);
}
