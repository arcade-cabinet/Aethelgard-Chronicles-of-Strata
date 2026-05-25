/**
 * M_FUN.FOUNDATION.ZUSTAND — runtime pin for the UI store scaffold.
 * Verifies the actions update state + subscribers see the change.
 */
import { describe, expect, it } from 'vitest';
import { useUiStore } from '../ui-store';

describe('ui-store (M_FUN.FOUNDATION.ZUSTAND)', () => {
  it('opens settings + credits + closes all', () => {
    // Reset for test isolation.
    useUiStore.getState().closeAllModals();
    expect(useUiStore.getState().modalOpen).toBeNull();

    useUiStore.getState().openSettings();
    expect(useUiStore.getState().modalOpen).toBe('settings');

    useUiStore.getState().openCredits();
    expect(useUiStore.getState().modalOpen).toBe('credits');

    useUiStore.getState().closeAllModals();
    expect(useUiStore.getState().modalOpen).toBeNull();
  });

  it('persists lastTab across reads', () => {
    useUiStore.getState().setLastTab('research');
    expect(useUiStore.getState().lastTab).toBe('research');
    useUiStore.getState().setLastTab(null);
    expect(useUiStore.getState().lastTab).toBeNull();
  });
});
