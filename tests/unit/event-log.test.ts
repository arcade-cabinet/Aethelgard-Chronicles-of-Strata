import { describe, expect, it } from 'vitest';
import { createEventLog, eventLogFromNdjson, eventLogToNdjson, logEvent } from '@/game/event-log';

/**
 * M_EXPANSION.F.74 + F.75 — EventLog round-trip tests. NDJSON
 * encoding must survive a serialize → parse round-trip with byte-
 * identical entries. Header carries the determinism contract
 * (seedPhrase + eventSeed); parser must reject malformed input.
 */
describe('M_EXPANSION.F.74/.75 — EventLog round-trip', () => {
  it('createEventLog seeds an empty log with the metadata', () => {
    const log = createEventLog('phrase', 'seed', { mode: 'border-clash' });
    expect(log.seedPhrase).toBe('phrase');
    expect(log.eventSeed).toBe('seed');
    expect(log.entries.length).toBe(0);
    expect(log.config.mode).toBe('border-clash');
  });

  it('logEvent appends entries in order', () => {
    const log = createEventLog('p', 's', {});
    logEvent(log, 1.5, 'trainUnit', { role: 'Footman' });
    logEvent(log, 2.7, 'placeBuilding', { type: 'Farm', tileKey: '0,0' });
    expect(log.entries.length).toBe(2);
    expect(log.entries[0]?.t).toBe(1.5);
    expect(log.entries[1]?.kind).toBe('placeBuilding');
  });

  it('toNdjson / fromNdjson is a byte-identical round-trip', () => {
    const log = createEventLog('phrase', 'seed', { mode: 'border-clash', mapSize: 12 });
    logEvent(log, 1.5, 'trainUnit', { role: 'Footman' });
    logEvent(log, 2.7, 'placeBuilding', { type: 'Farm', tileKey: '0,0' });
    logEvent(log, 5.0, 'resign', {});
    const ndjson = eventLogToNdjson(log);
    const parsed = eventLogFromNdjson(ndjson);
    expect(parsed.seedPhrase).toBe(log.seedPhrase);
    expect(parsed.eventSeed).toBe(log.eventSeed);
    expect(parsed.config).toEqual(log.config);
    expect(parsed.entries).toEqual(log.entries);
    // Second-round serialize should produce IDENTICAL output.
    expect(eventLogToNdjson(parsed)).toBe(ndjson);
  });

  it('rejects empty input', () => {
    expect(() => eventLogFromNdjson('')).toThrow(/empty input/);
  });

  it('rejects unknown kind', () => {
    const bad = `${JSON.stringify({ seedPhrase: 'p', eventSeed: 's', config: {} })}
${JSON.stringify({ t: 1, kind: 'eatPancake', args: {} })}`;
    expect(() => eventLogFromNdjson(bad)).toThrow(/unknown kind/);
  });

  it('rejects malformed header', () => {
    const bad = `${JSON.stringify({ eventSeed: 's' })}
`;
    expect(() => eventLogFromNdjson(bad)).toThrow(/bad seedPhrase/);
  });
});
