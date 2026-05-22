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
});
