/**
 * Stub for @capacitor-community/sqlite in browser tests.
 *
 * The real @capacitor-community/sqlite + jeep-sqlite WASM cannot initialise
 * in headless Chromium (WebAssembly threading/import restrictions).
 * persistence.ts already short-circuits openDb() when import.meta.env.VITEST
 * is true, but Vite's module evaluation in browser-test mode still loads the
 * jeep-sqlite entry as a side-effect of bundling @capacitor-community/sqlite.
 *
 * This stub replaces the package with pure no-ops so no WASM is ever loaded
 * in the browser test environment.
 */

export class SQLiteConnection {
  // biome-ignore lint/suspicious/noExplicitAny: stub must accept any args
  constructor(_plugin: any) {}
  async initWebStore() {}
  async isConnection(_db: string, _readonly: boolean) {
    return { result: false };
  }
  async createConnection(
    _db: string,
    _encrypted: boolean,
    _mode: string,
    _version: number,
    _readonly: boolean,
  ) {
    return new SQLiteDBConnection();
  }
  async retrieveConnection(_db: string, _readonly: boolean) {
    return new SQLiteDBConnection();
  }
}

export class SQLiteDBConnection {
  async open() {}
  async execute(_statement: string) {
    return { changes: { changes: 0 } };
  }
  async run(_statement: string, _values?: unknown[]) {
    return { changes: { changes: 0, lastId: 0 } };
  }
  async query(_statement: string, _values?: unknown[]) {
    return { values: [] };
  }
  async close() {}
}

export const CapacitorSQLite = {};
