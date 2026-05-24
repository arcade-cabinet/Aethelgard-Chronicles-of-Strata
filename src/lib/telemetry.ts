/**
 * M_AUDIT2.ARCH.64 — telemetry facade.
 *
 * No-op default. The game runs entirely offline today (no network
 * permissions per PRIVACY policy — see M_AUDIT2.SEC2.33), so this
 * facade exists only so error-reporting code-paths have ONE call
 * site to swap in a real reporter (Sentry, PostHog, local crash
 * log file via Capacitor Filesystem) when a future release adds
 * opt-in telemetry.
 *
 * Default behaviour: structured console.error in dev, terse
 * console.error in prod (no stack/componentStack leak per
 * M_AUDIT2.SEC2.46).
 */

// Vite guarantees `import.meta.env` is always an object in transformed
// code; PROD is a boolean. The earlier `typeof import.meta !== undefined`
// guard was dead code per ESM spec.
const IS_PROD = import.meta.env.PROD === true;

export interface ErrorContext {
  /** Where the error happened (component name, system name, etc). */
  source: string;
  /** Optional extra structured fields. */
  [key: string]: unknown;
}

/**
 * Report an error. Prod builds log only `error.name + message`; dev
 * builds log the full stack so a developer can diagnose locally.
 * Either way the call is synchronous and never throws — telemetry
 * is the most fragile layer; it must not become a crash multiplier.
 */
export function reportError(error: unknown, context: ErrorContext): void {
  try {
    if (IS_PROD) {
      const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      console.error(`[${context.source}] ${msg}`);
    } else {
      console.error(`[${context.source}]`, error, context);
    }
  } catch {
    // Telemetry never throws back into the caller.
  }
}

/**
 * Report a user-facing event (build complete, victory, save failure)
 * for future opt-in analytics. No-op by default.
 */
export function reportEvent(_name: string, _payload?: Record<string, unknown>): void {
  // intentionally empty — wired when telemetry is opt-in
}
