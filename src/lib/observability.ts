/**
 * M_FUN.FOUNDATION.SENTRY + .ANALYTICS — observability scaffold.
 *
 * Per the no-network posture (Aethelgard is a downloadable / Pages
 * game with no telemetry by default), both Sentry and analytics
 * are GATED behind an explicit Settings opt-in. This module is
 * the API surface the rest of the app calls; the actual SDK
 * import is dynamic + lazy so a user who never opts in pays zero
 * bundle cost or runtime overhead.
 *
 * The opt-in preference key is `prefs.observabilityOptIn` (Capacitor
 * Preferences). When `true`, calling reportError / trackEvent
 * dynamically imports the SDK and forwards. When `false` or
 * unset (the default), every call is a synchronous no-op.
 *
 * Wire-up for the actual SDK lands in M_FUN.FOUNDATION.SENTRY.WIRE
 * (separate sub-task) once the user-facing opt-in toggle is in
 * SettingsModal.
 */

/** Local in-memory cache so we don't hit Preferences every call. */
let optedIn = false;

/** Set the opt-in flag (called once at module init AND on toggle). */
export function setObservabilityOptIn(value: boolean): void {
  optedIn = value;
}

/** Has the user opted in to observability? Read-only accessor. */
export function isObservabilityOptedIn(): boolean {
  return optedIn;
}

/**
 * Report a runtime error. Today a no-op unless opted-in; future
 * implementation dynamic-imports @sentry/browser and forwards.
 */
export function reportError(err: unknown, context?: Record<string, unknown>): void {
  if (!optedIn) return;
  // M_FUN.FOUNDATION.SENTRY.WIRE — dynamic import lands here.
  // For now log to the local error overlay (already handles
  // window.onerror; this is the explicit-call path).
  console.error('[observability] reportError', err, context);
}

/**
 * Track a one-shot event. Today a no-op unless opted-in; future
 * implementation dynamic-imports plausible / posthog SDK.
 */
export function trackEvent(name: string, props?: Record<string, unknown>): void {
  if (!optedIn) return;
  // M_FUN.FOUNDATION.ANALYTICS.WIRE — dynamic import lands here.
  console.info('[observability] trackEvent', name, props);
}
