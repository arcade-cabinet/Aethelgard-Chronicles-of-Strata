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
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
