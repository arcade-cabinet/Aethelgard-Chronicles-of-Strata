// M_FUN.FOUNDATION.WHY-RENDER — must run BEFORE any React import
// elsewhere. The side-effect module patches React.createElement
// only when import.meta.env.DEV. Production builds skip the call
// + bundlers tree-shake the import.
import './wdyr';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// M_SEC.9 — self-host webfonts so the CSP can drop fonts.googleapis.com
// + fonts.gstatic.com from font-src/style-src. @fontsource ships the
// woff2 alongside @font-face CSS; bundling makes the install fully
// offline-capable + fingerprint-cacheable. Inter at all 6 weights used
// across the HUD; Metamorphous as the display face for game titles.
import '@fontsource/metamorphous/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/inter/900.css';
// Tailwind v4 + Aethelgard design tokens. After @fontsource imports so
// font tokens reference the @font-face rules already registered.
import './styles.css';
import { installErrorOverlayHooks } from '@/hud/ErrorOverlay';
import { reportError } from '@/lib/telemetry';
import { validateWorldFonts } from '@/world/world-text-font';
import { App } from './App';

// M_POLISH3.SCENE.2 — install the global error-capture hooks BEFORE
// anything else runs. The React <ErrorOverlay> component would only
// install on mount (via useEffect), missing any early boot errors
// (font validation, asset preload, persistence facade, codegen).
// Pulling install up here guarantees every console.error / fetch
// failure / window.error / unhandledrejection from the entire app
// lifetime is captured.
if (typeof window !== 'undefined') {
  installErrorOverlayHooks();
}

// M_AUDIT2.SEC2.47 — global error capture wired into the telemetry
// facade so prod builds strip stack/componentStack per M_AUDIT2.SEC2.46.
// M_AUDIT2.SEC2.30 — mask WEBGL_debug_renderer_info. Three.js never
// reads it but a copy-pasted dependency or a future devtools probe
// could leak the GPU vendor/renderer string (a known browser-
// fingerprint surface). Wrap getExtension on both WebGL1 + WebGL2
// prototypes so the extension always reports unavailable.
if (typeof WebGLRenderingContext !== 'undefined') {
  const wrap = (proto: { getExtension: (name: string) => unknown }) => {
    const original = proto.getExtension;
    proto.getExtension = function (this: unknown, name: string) {
      if (name === 'WEBGL_debug_renderer_info') return null;
      return original.call(this, name);
    };
  };
  wrap(WebGLRenderingContext.prototype as unknown as { getExtension: (name: string) => unknown });
  if (typeof WebGL2RenderingContext !== 'undefined') {
    wrap(
      WebGL2RenderingContext.prototype as unknown as { getExtension: (name: string) => unknown },
    );
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    reportError(e.reason, { source: 'unhandledrejection' });
  });
  window.addEventListener('error', (e) => {
    reportError(e.error ?? e.message, { source: 'window.error' });
  });
  // M_AUDIT2.UX.24 — block the browser context menu inside the game
  // shell so right-clicking the HUD doesn't break immersion. The mesh-
  // level onContextMenu already prevents canvas right-clicks; this
  // catches the panels.
  document.addEventListener('contextmenu', (e) => {
    if ((e.target as HTMLElement | null)?.closest('#root')) e.preventDefault();
  });
  // M_AUDIT2.ARCH.69 — Howler's shared AudioContext suspends when the
  // tab / Capacitor WebView hides; the first sound after unhide is
  // silent until something queues a resume. Resume proactively on
  // visibilitychange. Lazy import so howler doesn't preload before
  // any audio code-path actually runs.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      void import('@/audio/buses').then((m) => m.resumeAudioContextIfSuspended());
    }
  });
  // M_AUDIT2.SEC2.31 — first-interaction gate for Howler. Listen
  // once on pointerdown + keydown + touchstart; flip the gate so
  // any pending playMusic() drains. The listeners are { once: true }
  // so they unregister themselves after firing.
  const unlock = () => {
    void import('@/audio/buses').then((m) => m.recordUserInteraction());
  };
  document.addEventListener('pointerdown', unlock, { once: true, passive: true });
  document.addEventListener('keydown', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true, passive: true });
  // M_EXPANSION.AU.44 — sim → audio bridge for the magic-cast SFX
  // (offensive-behavior fires the event when a magic projectile
  // spawns; ui-sound-emitter takes it from here).
  window.addEventListener('aethelgard:magic-cast', () => {
    void import('@/audio/ui-sound-emitter').then((m) => m.emitUiSound('magic-cast'));
  });
  // M_EXPANSION.AU.47 — sim → audio bridge for unit-death SFX.
  // Pick the audio event by the unit's damageType (Trebuchet=siege
  // thud, Wizard=magic puff, others=normal thud).
  window.addEventListener('aethelgard:unit-death', (e) => {
    const detail = (e as CustomEvent<{ unitType: string }>).detail;
    if (!detail) return;
    void Promise.all([import('@/audio/ui-sound-emitter'), import('@/rules/unit-profiles')]).then(
      ([emitter, profiles]) => {
        // M_CODE_REVIEW.6 — runtime type guard replaces the prior
        // `as any` cast. profiles.UNIT_PROFILES is the registry; we
        // narrow detail.unitType via Object.hasOwn before calling
        // unitProfileFor. Unknown unitTypes now produce a single
        // dev warning instead of silently swallowing in try/catch
        // — bugs surface, the audio bridge still doesn't crash.
        const u = detail.unitType;
        if (!Object.hasOwn(profiles.UNIT_PROFILES, u)) {
          console.warn('[audio-bridge] unknown unitType in unit-death event:', u);
          emitter.emitUiSound('unit-death-normal');
          return;
        }
        // u is now known to be a key of UNIT_PROFILES — safe cast.
        const p = profiles.unitProfileFor(u as keyof typeof profiles.UNIT_PROFILES);
        try {
          const event =
            p.damageType === 'siege'
              ? 'unit-death-siege'
              : p.damageType === 'magic'
                ? 'unit-death-magic'
                : 'unit-death-normal';
          emitter.emitUiSound(event);
        } catch {
          emitter.emitUiSound('unit-death-normal');
        }
      },
    );
  });
}

// M_POLISH3.SCENE.1 — validate the world-text TTFs at app boot.
// If any TTF is missing / corrupted / an HTML 404 page (the failure
// mode that just took down the whole r3f Scene because troika-three-
// text throws synchronously on bad TTF), the validator pushes a
// console.error which the ErrorOverlay surfaces to the player.
if (typeof window !== 'undefined') {
  validateWorldFonts();
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// M_HUD.SHELL.13 — fixture-mode URL routing. When `?fixture=<name>`
// is present, mount the FixtureApp which renders a SINGLE screen
// with mocked props in isolation. Used by the visual fixture battery
// (scripts/capture-aethelgard-fixtures.mjs) so screen captures don't
// need to drive the full title → new-game → onboarding → play flow.
const fixture =
  typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('fixture')
    : null;

if (fixture) {
  void import('./test/FixtureApp').then((mod) => {
    createRoot(rootEl).render(
      <StrictMode>
        <mod.FixtureApp fixture={fixture} />
      </StrictMode>,
    );
  });
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
