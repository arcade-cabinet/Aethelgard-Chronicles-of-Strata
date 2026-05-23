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
import { App } from './App';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
