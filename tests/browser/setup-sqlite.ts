/**
 * Browser-test setup: no-op for jeep-sqlite in the vitest browser environment.
 *
 * `@capacitor-community/sqlite` on web checks for a `jeep-sqlite` custom
 * element. In production this is handled by ensureJeepSqliteElement() in
 * persistence.ts. In browser tests, persistence.ts short-circuits openDb()
 * when import.meta.env.VITEST === true, so the WASM is never loaded and
 * the element check is never reached.
 *
 * Loading jeep-sqlite/loader here would eagerly initialize the WASM module,
 * which fails in headless Chromium (threading/import restrictions) and
 * produces unhandled rejections. So we don't load it at all in tests.
 *
 * This file exists purely as the designated setupFiles entry for the browser
 * project in vitest.config.ts; future test-env setup can be added here.
 */

export {};
