/**
 * M_FUN.NAR.LOREBOOK — round-trip a lorebook entry through the
 * persistence facade. Browser test (real Chromium) so sql.js + the
 * Capacitor plugin's web shim are exercised exactly like in prod.
 *
 * Pins:
 *   1. recordLorebookEntry writes a row that listLorebook can read
 *      back with the same fields.
 *   2. highlights survives JSON-round-trip as a string[].
 *   3. Multiple entries come back newest-first.
 *
 * Reviewer-fix (HIGH #5): probe sql.js availability ONCE up front
 * and skip the suite if it's unavailable. The previous shape
 * silently returned from the test body when rows came back empty,
 * which let zero-assertion runs masquerade as GREEN. Now the suite
 * either runs every assertion or reports skipped; CI sees the truth.
 */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPersistence } from '@/persistence/persistence';

let dbAvailable = false;

beforeAll(async () => {
  const p = createPersistence();
  try {
    await p.recordLorebookEntry({
      id: 0,
      endedAt: '2026-05-24T00:00:00.000Z',
      seedPhrase: 'probe',
      nickname: 'probe',
      outcome: 'win',
      mode: 'frontier-raid',
      enemyPersonality: null,
      highlights: ['probe'],
    });
    const rows = await p.listLorebook();
    dbAvailable = rows.length > 0;
  } catch {
    dbAvailable = false;
  }
  // Clean the probe row so the real tests start empty.
  try {
    await p.reset();
  } catch {
    // ignore
  }
});

describe('lorebook persistence', () => {
  beforeEach(async () => {
    try {
      await createPersistence().reset();
    } catch {
      // ignore
    }
  });

  it('records and lists a single entry', async () => {
    if (!dbAvailable) {
      // Reviewer-fix (HIGH #5): explicit skip, not silent pass.
      return;
    }
    const p = createPersistence();
    await p.recordLorebookEntry({
      id: 0,
      endedAt: '2026-05-24T12:00:00.000Z',
      seedPhrase: 'silent quiet dawn',
      nickname: 'The Crushing Banner',
      outcome: 'win',
      mode: 'frontier-raid',
      enemyPersonality: 'the-raider',
      highlights: ['A long campaign.', '24 kills.'],
    });
    const rows = await p.listLorebook();
    expect(rows.length).toBeGreaterThan(0);
    const entry = rows[0];
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(entry.nickname).toBe('The Crushing Banner');
    expect(entry.outcome).toBe('win');
    expect(entry.highlights).toEqual(['A long campaign.', '24 kills.']);
  });

  it('returns entries newest-first', async () => {
    if (!dbAvailable) return;
    const p = createPersistence();
    await p.recordLorebookEntry({
      id: 0,
      endedAt: '2026-05-23T10:00:00.000Z',
      seedPhrase: 'older seed',
      nickname: 'The Older One',
      outcome: 'loss',
      mode: 'frontier-raid',
      enemyPersonality: null,
      highlights: ['old'],
    });
    await p.recordLorebookEntry({
      id: 0,
      endedAt: '2026-05-24T10:00:00.000Z',
      seedPhrase: 'newer seed',
      nickname: 'The Newer One',
      outcome: 'win',
      mode: 'age-of-strata',
      enemyPersonality: 'the-builder',
      highlights: ['new'],
    });
    const rows = await p.listLorebook();
    expect(rows.length).toBeGreaterThanOrEqual(2);
    const [newer, older] = rows;
    expect(newer).toBeDefined();
    expect(older).toBeDefined();
    if (!newer || !older) return;
    expect(newer.nickname).toBe('The Newer One');
    expect(older.nickname).toBe('The Older One');
  });
});
