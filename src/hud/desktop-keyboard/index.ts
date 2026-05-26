/**
 * Desktop-keyboard subpackage (M_HUD.SHELL.15).
 *
 * Decompose-don't-strip extraction of keyboard nav from the HUD pages.
 * Consumers gate adoption per `viewport.class === 'desktop' |
 * 'ultraWide'` so mobile / tablet / foldable users never get the
 * shortcuts (and tests never depend on them).
 */
export { type DesktopShortcut, useDesktopShortcuts } from './useDesktopShortcuts';
