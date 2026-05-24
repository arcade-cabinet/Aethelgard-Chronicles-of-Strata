import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _resetCaptionsForTests,
  CAPTIONS_FOR_EVENT,
  getLiveCaptions,
  isCaptionsEnabled,
  pushCaptionForEvent,
  setCaptionsEnabled,
  subscribeCaptions,
} from '@/hud/captions';

/**
 * M_EXPANSION.U.114 — captions/subtitles for deaf accessibility.
 *
 * Pins:
 *   - default off + idempotent setter
 *   - push is a no-op when off
 *   - push is a no-op for events with empty captions (footsteps,
 *     unit-select, ui-button-click — high-frequency events that
 *     would flood the band)
 *   - rapid-fire identical events COALESCE (refresh TTL on the
 *     existing entry, don't stack)
 *   - distinct events stack up to CAPTION_MAX, oldest evicted
 *   - expired entries prune on read
 *   - every GameAudioEvent has a CAPTIONS_FOR_EVENT entry (even
 *     if empty)
 */
describe('M_EXPANSION.U.114 — captions registry', () => {
  afterEach(() => {
    _resetCaptionsForTests();
  });

  it('defaults to off', () => {
    expect(isCaptionsEnabled()).toBe(false);
  });

  it('push is a no-op when off', () => {
    pushCaptionForEvent('combat-hit', 1000);
    expect(getLiveCaptions(1000).length).toBe(0);
  });

  it('push is a no-op for empty-caption events (footstep-grass)', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('footstep-grass', 1000);
    pushCaptionForEvent('unit-select', 1000);
    pushCaptionForEvent('ui-button-click', 1000);
    expect(getLiveCaptions(1000).length).toBe(0);
  });

  it('pushing a captioned event creates a live caption', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('victory', 1000);
    const live = getLiveCaptions(1100);
    expect(live.length).toBe(1);
    expect(live[0]?.text).toBe(CAPTIONS_FOR_EVENT.victory);
  });

  it('rapid-fire identical events coalesce (TTL refresh, not stack)', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('combat-hit', 1000);
    pushCaptionForEvent('combat-hit', 1050);
    pushCaptionForEvent('combat-hit', 1100);
    const live = getLiveCaptions(1150);
    expect(live.length).toBe(1);
  });

  it('distinct events stack', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('combat-hit', 1000);
    pushCaptionForEvent('building-completed', 1010);
    pushCaptionForEvent('research-purchased', 1020);
    expect(getLiveCaptions(1030).length).toBe(3);
  });

  it('CAPTION_MAX caps the visible stack (FIFO eviction)', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('combat-hit', 1000);
    pushCaptionForEvent('building-completed', 1010);
    pushCaptionForEvent('research-purchased', 1020);
    pushCaptionForEvent('victory', 1030);
    const live = getLiveCaptions(1040);
    expect(live.length).toBe(3);
    // 'combat-hit' was evicted; victory is the newest tail
    expect(live.map((c) => c.text)).not.toContain(CAPTIONS_FOR_EVENT['combat-hit']);
    expect(live[live.length - 1]?.text).toBe(CAPTIONS_FOR_EVENT.victory);
  });

  it('expired entries are pruned on next read', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('victory', 1000);
    expect(getLiveCaptions(1500).length).toBe(1);
    expect(getLiveCaptions(5000).length).toBe(0);
  });

  it('disabling clears the live list + notifies subscribers', () => {
    setCaptionsEnabled(true);
    pushCaptionForEvent('victory', 1000);
    const cb = vi.fn();
    const unsub = subscribeCaptions(cb);
    setCaptionsEnabled(false);
    expect(cb).toHaveBeenCalledWith([]);
    expect(getLiveCaptions(1000).length).toBe(0);
    unsub();
  });

  it('every GameAudioEvent has an entry in CAPTIONS_FOR_EVENT', () => {
    // sample a few important ones — full contract check happens in
    // sound-map.test.ts which iterates the union type. Here we just
    // pin the critical-to-caption set.
    expect(CAPTIONS_FOR_EVENT.victory).toBeTruthy();
    expect(CAPTIONS_FOR_EVENT.defeat).toBeTruthy();
    expect(CAPTIONS_FOR_EVENT['critical-alarm']).toBeTruthy();
    expect(CAPTIONS_FOR_EVENT.achievement).toBeTruthy();
  });
});
