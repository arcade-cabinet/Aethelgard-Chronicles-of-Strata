// M_NEXT.PLAY.1 — Vite injects __APP_VERSION__ via the `define`
// hook in vite.config.ts (reads package.json#version at build time).
// Declared as a global so any module can reference it without
// importing — matches the bundler's literal-replacement behavior.

declare const __APP_VERSION__: string;
