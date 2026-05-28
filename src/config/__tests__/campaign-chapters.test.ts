/**
 * M_V11.CAMPAIGN (#77g) — chapter registry shape pins.
 *
 * Pins that the registry carries 3 chapters, each with non-empty
 * objectives, valid seed phrase, and a stable id ↔ definition map.
 */
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_CHAPTERS, CHAPTER_IDS, chapterFor } from '@/config/narrative';

describe('M_V11.CAMPAIGN — chapter registry', () => {
  it('exposes exactly 3 chapters', () => {
    expect(CHAPTER_IDS.length).toBe(3);
    expect(Object.keys(CAMPAIGN_CHAPTERS).length).toBe(3);
  });

  it('every chapter has at least 4 objectives', () => {
    for (const id of CHAPTER_IDS) {
      const chapter = chapterFor(id);
      expect(chapter.objectives.length, `${id}`).toBeGreaterThanOrEqual(4);
    }
  });

  it('every chapter carries a non-empty title, synopsis, and seed phrase', () => {
    for (const id of CHAPTER_IDS) {
      const chapter = chapterFor(id);
      expect(chapter.title.length).toBeGreaterThan(0);
      expect(chapter.synopsis.length).toBeGreaterThan(0);
      expect(chapter.seedPhrase.length).toBeGreaterThan(0);
    }
  });

  it('every objective carries an id + title + body + check predicate', () => {
    for (const id of CHAPTER_IDS) {
      for (const obj of chapterFor(id).objectives) {
        expect(obj.id.length).toBeGreaterThan(0);
        expect(obj.title.length).toBeGreaterThan(0);
        expect(obj.body.length).toBeGreaterThan(0);
        expect(typeof obj.check).toBe('function');
      }
    }
  });

  it('every objective id is unique within its chapter', () => {
    for (const id of CHAPTER_IDS) {
      const ids = chapterFor(id).objectives.map((o) => o.id);
      expect(new Set(ids).size, `${id} duplicates`).toBe(ids.length);
    }
  });
});
