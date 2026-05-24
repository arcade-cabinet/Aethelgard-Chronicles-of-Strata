/**
 * M_FUN.FOUNDATION.ZUSTAND — UI-side state store.
 *
 * Today the HUD reads game state through prop drilling
 * (`<GameOverModal game={game} />` etc) AND tests poll
 * `window.__game` directly. Both work but they're a footgun —
 * a renderer that should be reading from a stable observable
 * snapshot ends up re-rendering on every game-state field change
 * because the entire `game` object is its dependency.
 *
 * This store is the seed for the migration: HUD-LOCAL preferences
 * (which modal is open, last clicked tab, etc) live here from
 * day one; gameplay state will follow on a per-component basis
 * as each HUD piece is touched.
 *
 * NEVER duplicate `game.outcome` etc here. The store is for state
 * that the HUD OWNS (modal open/close, scrub position, etc), not
 * a mirror of the koota ECS or runEconomyTick state. That data
 * stays in the GameState; the store stores only HUD intent.
 */
import { create } from 'zustand';

interface UiStoreState {
  /** Which top-level modal is currently open (null = none). */
  modalOpen: 'settings' | 'credits' | 'gameover' | null;
  /** Toggle the settings modal (idempotent). */
  openSettings: () => void;
  /** Toggle the credits modal (idempotent). */
  openCredits: () => void;
  /** Close every modal. */
  closeAllModals: () => void;
  /**
   * Last-clicked HUD tab id. Free-form string — each consumer
   * declares its own tab namespace.
   */
  lastTab: string | null;
  setLastTab: (id: string | null) => void;
}

/**
 * The application's UI state store. Import this hook from a React
 * component; subscribers re-render only when the selected slice
 * changes (zustand's default selector behaviour).
 *
 * Example:
 *   const open = useUiStore((s) => s.modalOpen === 'settings');
 *   const openSettings = useUiStore((s) => s.openSettings);
 */
export const useUiStore = create<UiStoreState>((set) => ({
  modalOpen: null,
  openSettings: () => set({ modalOpen: 'settings' }),
  openCredits: () => set({ modalOpen: 'credits' }),
  closeAllModals: () => set({ modalOpen: null }),
  lastTab: null,
  setLastTab: (id) => set({ lastTab: id }),
}));
