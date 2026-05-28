/**
 * hud/modals — the dialog + full-panel surfaces (M_V13.DECOMP.HUD-MODALS).
 *
 * Everything that opens as a dismissable dialog or takeover panel:
 * the new-game + settings modals, the game-over modal (with its
 * MatchSummaryCard), diplomacy, the discoveries panel, the Atelier
 * meta-progression screen, the credits modal, and the hotkey editor.
 *
 * GameOverModal→MatchSummaryCard and SettingsModal→HotkeyEditor are
 * intra-bucket compositions (kept ./-relative).
 */
export {
  NewGameModal,
  type NewGameModalProps,
  type NewGameChoices,
} from './NewGameModal';
export { SettingsModal, type SettingsModalProps } from './SettingsModal';
export { GameOverModal, type GameOverModalProps } from './GameOverModal';
export { DiplomacyModal, type DiplomacyModalProps } from './DiplomacyModal';
export { DiscoveriesPanel } from './DiscoveriesPanel';
export { AtelierScreen, type AtelierScreenProps } from './AtelierScreen';
export { CreditsModal, type CreditsModalProps } from './CreditsModal';
export { HotkeyEditor, type HotkeyEditorProps } from './HotkeyEditor';
export { MatchSummaryCard, type MatchSummaryCardProps } from './MatchSummaryCard';
