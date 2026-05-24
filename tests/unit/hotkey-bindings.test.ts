import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _resetHotkeyBindingsForTests,
  actionForKey,
  DEFAULT_BINDINGS,
  getBinding,
  getBindings,
  loadBindings,
  resetBindings,
  serializeBindings,
  setBinding,
  subscribeBindings,
} from '@/hud/hotkey-bindings';

/**
 * M_EXPANSION.U.115 — user-remappable hotkey bindings. Pins:
 *   - defaults match the legacy hard-coded keys
 *   - setBinding round-trips
 *   - collisions are detected and rejected (without partial-state)
 *   - idempotent writes return 'unchanged' (no listener spam)
 *   - actionForKey is the reverse lookup
 *   - load/serialize survive a JSON round-trip
 *   - resetBindings + a corrupt-blob loadBindings restore defaults
 *   - subscribers fire on transitions only + cleanup on unsubscribe
 */
describe('M_EXPANSION.U.115 — hotkey bindings', () => {
  afterEach(() => {
    _resetHotkeyBindingsForTests();
  });

  it('defaults match the documented keys', () => {
    expect(getBinding('build.Farm')).toBe('f');
    expect(getBinding('build.House')).toBe('h');
    expect(getBinding('select.clear')).toBe('Escape');
    expect(getBindings()).toEqual(DEFAULT_BINDINGS);
  });

  it('setBinding writes the new key and returns ok', () => {
    expect(setBinding('build.Farm', 'q')).toBe('ok');
    expect(getBinding('build.Farm')).toBe('q');
  });

  it('a collision is rejected without partial state', () => {
    // 'h' is already bound to build.House
    expect(setBinding('build.Farm', 'h')).toBe('collision');
    expect(getBinding('build.Farm')).toBe('f');
  });

  it('an idempotent write returns unchanged + does NOT fire subscribers', () => {
    const cb = vi.fn();
    const unsub = subscribeBindings(cb);
    expect(setBinding('build.Farm', 'f')).toBe('unchanged');
    expect(cb).not.toHaveBeenCalled();
    unsub();
  });

  it('actionForKey reverse-lookup', () => {
    expect(actionForKey('f')).toBe('build.Farm');
    expect(actionForKey('Escape')).toBe('select.clear');
    expect(actionForKey('xyz')).toBe(null);
  });

  it('serialize → load round-trips', () => {
    setBinding('build.Farm', 'q');
    setBinding('build.Granary', 'z');
    const blob = serializeBindings();
    _resetHotkeyBindingsForTests();
    expect(getBinding('build.Farm')).toBe('f');
    loadBindings(blob);
    expect(getBinding('build.Farm')).toBe('q');
    expect(getBinding('build.Granary')).toBe('z');
    // Unmodified bindings still match defaults
    expect(getBinding('build.House')).toBe('h');
  });

  it('a corrupt blob is silently rejected (defaults preserved)', () => {
    setBinding('build.Farm', 'q');
    loadBindings('{ this is not json');
    // The corrupt load should NOT clobber the prior state
    expect(getBinding('build.Farm')).toBe('q');
  });

  it('resetBindings restores defaults + notifies subscribers', () => {
    const cb = vi.fn();
    const unsub = subscribeBindings(cb);
    setBinding('build.Farm', 'q');
    expect(cb).toHaveBeenCalledTimes(1);
    resetBindings();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(getBinding('build.Farm')).toBe('f');
    unsub();
  });

  it('unsubscribe removes the listener', () => {
    const cb = vi.fn();
    const unsub = subscribeBindings(cb);
    setBinding('build.Farm', 'q');
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    setBinding('build.Farm', 'z');
    expect(cb).toHaveBeenCalledTimes(1);
  });
});
