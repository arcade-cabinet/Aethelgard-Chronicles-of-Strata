import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.arcadecabinet.aethelgard',
  appName: 'Aethelgard',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // M_AUDIT2.SEC2.4 — unique hostname so the WebView storage partition
    // (localStorage / IndexedDB / Preferences on web fallback) is scoped
    // to THIS app's origin. Capacitor default 'localhost' would share
    // origin with any other Capacitor app on the device.
    hostname: 'aethelgard.local',
  },
  android: {
    // M_AUDIT2.SEC2.3 — explicit security defaults for release builds.
    // Capacitor sets sane defaults but pinning them here makes the
    // policy version-controlled + diff-reviewable; a future Capacitor
    // upgrade that flips a default doesn't silently weaken the app.
    webContentsDebuggingEnabled: false,
    allowMixedContent: false,
    captureInput: true,
  },
};

export default config;
