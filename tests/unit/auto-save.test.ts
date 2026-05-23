import { describe, expect, it, vi } from 'vitest';
import { createAutoSave, tickAutoSave } from '@/game/auto-save';

describe('auto-save', () => {
  it('fires the save callback once per interval', () => {
    const save = vi.fn();
    const auto = createAutoSave(save);
    // advance 5 minutes (300s) of game time
    for (let i = 0; i < 300; i++) tickAutoSave(auto, 1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('does not fire before the interval elapses', () => {
    const save = vi.fn();
    const auto = createAutoSave(save);
    for (let i = 0; i < 100; i++) tickAutoSave(auto, 1);
    expect(save).not.toHaveBeenCalled();
  });

  it('M_AUDIT2.SEC2.27 — skips and counts when a previous save is in flight', async () => {
    let resolvePending: (() => void) | null = null;
    let fired = 0;
    const auto = createAutoSave(() => {
      fired += 1;
      return new Promise<void>((resolve) => {
        resolvePending = resolve;
      });
    });
    // First tick fires the save (promise left pending).
    for (let i = 0; i < 300; i++) tickAutoSave(auto, 1);
    expect(fired).toBe(1);
    expect(auto.saving).toBe(true);
    expect(auto.skipped).toBe(0);

    // Second interval ticks past — should NOT fire; increments skipped.
    for (let i = 0; i < 300; i++) tickAutoSave(auto, 1);
    expect(fired).toBe(1);
    expect(auto.skipped).toBe(1);

    // Resolve the pending save; next interval fires again.
    (resolvePending as null | (() => void))?.();
    await Promise.resolve();
    await Promise.resolve();
    expect(auto.saving).toBe(false);
    for (let i = 0; i < 300; i++) tickAutoSave(auto, 1);
    expect(fired).toBe(2);
  });
});
