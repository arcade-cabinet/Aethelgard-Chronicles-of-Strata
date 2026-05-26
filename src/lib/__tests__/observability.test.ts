/**
 * M_FUN.FOUNDATION.SENTRY + .ANALYTICS — opt-in gate pin.
 * No-op by default; logs only when opted in.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isObservabilityOptedIn,
  reportError,
  setObservabilityOptIn,
  trackEvent,
} from '../observability';

describe('observability (M_FUN.FOUNDATION.SENTRY + .ANALYTICS)', () => {
  afterEach(() => setObservabilityOptIn(false));

  it('is opted OUT by default', () => {
    expect(isObservabilityOptedIn()).toBe(false);
  });

  it('reportError is a no-op when opted out', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportError(new Error('boom'));
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('trackEvent is a no-op when opted out', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    trackEvent('test');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('reportError fires once opted in', () => {
    setObservabilityOptIn(true);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    reportError(new Error('boom'));
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('trackEvent fires once opted in', () => {
    setObservabilityOptIn(true);
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    trackEvent('match-finished', { outcome: 'win' });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
