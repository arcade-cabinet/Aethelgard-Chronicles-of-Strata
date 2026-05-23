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
import { reportError } from '@/lib/telemetry';
import { App } from './App';

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
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
