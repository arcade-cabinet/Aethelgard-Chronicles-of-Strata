/**
 * M_EXPANSION.F.74 + F.75 — EventLog: minimal deterministic
 * command record for replay export/import.
 *
 * Recorded events are NDJSON-friendly (one JSON object per line)
 * containing the issuer's COMMAND, parameters, and the game-clock
 * timestamp. Replay imports re-issue the same commands in order
 * against a freshly-seeded game; deterministic systems (combat,
 * AI, weather) replay byte-identically because seedPhrase +
 * eventSeed travel with the log header.
 *
 * Scope today: covers placeBuilding / placeRoad / trainUnit /
 * setRally / resign / doResearch / tradeResource / foundBase /
 * issueMoveOrder. Internal cmd state (autoSave, save-load) is
 * NOT logged — replay always starts from a fresh game.
 */

export type EventLogKind =
  | 'placeBuilding'
  | 'placeRoad'
  | 'trainUnit'
  | 'setRally'
  | 'resign'
  | 'doResearch'
  | 'tradeResource'
  | 'foundBase'
  | 'issueMoveOrder';

export interface EventLogEntry {
  /** Game-clock seconds when the command was issued. */
  t: number;
  /** Command kind. */
  kind: EventLogKind;
  /** Command-specific args, serializable. */
  args: Record<string, unknown>;
}

export interface EventLog {
  /** Map seed phrase the game was started with. */
  seedPhrase: string;
  /** Device-level event PRNG seed. */
  eventSeed: string;
  /** Match config (mode / mapSize / difficulty / extras). */
  config: Record<string, unknown>;
  /** Ordered command entries. */
  entries: EventLogEntry[];
}

export function createEventLog(seedPhrase: string, eventSeed: string, config: Record<string, unknown>): EventLog {
  return { seedPhrase, eventSeed, config, entries: [] };
}

/** Append one entry. */
export function logEvent(log: EventLog, t: number, kind: EventLogKind, args: Record<string, unknown>): void {
  log.entries.push({ t, kind, args });
}

/**
 * F.74 — serialize an EventLog to NDJSON for download.
 * Line 1: header `{ "seedPhrase": ..., "eventSeed": ..., "config": ... }`
 * Lines 2..N: one entry per line.
 */
export function eventLogToNdjson(log: EventLog): string {
  const header = JSON.stringify({
    seedPhrase: log.seedPhrase,
    eventSeed: log.eventSeed,
    config: log.config,
  });
  const lines = log.entries.map((e) => JSON.stringify(e));
  return [header, ...lines].join('\n');
}

/**
 * F.75 — parse NDJSON back to an EventLog. Throws on malformed
 * header / unknown kind. Forward-compatible: unknown args fields
 * pass through.
 */
export function eventLogFromNdjson(ndjson: string): EventLog {
  const lines = ndjson.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) throw new Error('eventLogFromNdjson: empty input');
  const headerRaw = lines[0];
  if (!headerRaw) throw new Error('eventLogFromNdjson: missing header');
  const header = JSON.parse(headerRaw) as {
    seedPhrase?: unknown;
    eventSeed?: unknown;
    config?: unknown;
  };
  if (typeof header.seedPhrase !== 'string') throw new Error('eventLogFromNdjson: bad seedPhrase');
  if (typeof header.eventSeed !== 'string') throw new Error('eventLogFromNdjson: bad eventSeed');
  const log = createEventLog(
    header.seedPhrase,
    header.eventSeed,
    (header.config as Record<string, unknown>) ?? {},
  );
  const validKinds = new Set<EventLogKind>([
    'placeBuilding',
    'placeRoad',
    'trainUnit',
    'setRally',
    'resign',
    'doResearch',
    'tradeResource',
    'foundBase',
    'issueMoveOrder',
  ]);
  for (let i = 1; i < lines.length; i++) {
    const lineRaw = lines[i];
    if (!lineRaw) continue;
    const entry = JSON.parse(lineRaw) as Partial<EventLogEntry>;
    if (typeof entry.t !== 'number' || !Number.isFinite(entry.t)) {
      throw new Error(`eventLogFromNdjson: bad t on line ${i + 1}`);
    }
    if (typeof entry.kind !== 'string' || !validKinds.has(entry.kind as EventLogKind)) {
      throw new Error(`eventLogFromNdjson: unknown kind on line ${i + 1}`);
    }
    if (entry.args === null || typeof entry.args !== 'object') {
      throw new Error(`eventLogFromNdjson: bad args on line ${i + 1}`);
    }
    log.entries.push({ t: entry.t, kind: entry.kind as EventLogKind, args: entry.args as Record<string, unknown> });
  }
  return log;
}

/**
 * F.74 — trigger a browser download of the current log as a
 * .ndjson file. Cheap: blob URL + anchor click + revoke.
 */
export function downloadEventLog(log: EventLog, filename = 'aethelgard-replay.ndjson'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const ndjson = eventLogToNdjson(log);
  const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
