/**
 * M_FUN.PHONE.PINCH — module smoke pin. The hook's gesture
 * behaviour is e2e territory (Playwright touch emulation); this
 * test just confirms the module loads + exports the helper so a
 * future tsc regression fails fast.
 */
import { describe, expect, it } from 'vitest';
import { usePinchZoom } from '../usePinchZoom';

describe('usePinchZoom (M_FUN.PHONE.PINCH)', () => {
  it('module exports the hook function', () => {
    expect(usePinchZoom).toBeDefined();
    expect(typeof usePinchZoom).toBe('function');
  });
});
