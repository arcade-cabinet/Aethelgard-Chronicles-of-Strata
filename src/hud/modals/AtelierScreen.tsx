/**
 * M_V11.META-PROGRESSION — AtelierScreen between-match modal.
 *
 * Shown after every match-end (win or lose) so the player sees their
 * meta-progression status. Lists the 30 META_UNLOCKS grouped by
 * category, with locked / unlocked / affordable / can't-afford state
 * per row. The player spends lore tokens earned from match wins
 * (loreTokenReward()) to unlock permanent bonuses.
 *
 * Opens on the 'aethelgard:open-atelier' window event — fired
 * automatically from the match-end flow, plus exposed via the
 * SystemMenu Atelier entry so the player can browse between matches.
 *
 * Every interactive control carries id= + aria-label so Maestro can
 * tap-target it.
 *
 * See docs/specs/GAME-DESIGN-AUDIT.md task #77c for design intent.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { type CSSProperties, useEffect, useState } from 'react';
import {
  type MetaUnlock,
  type MetaUnlockCategory,
  metaUnlocksByCategory,
} from '@/config/meta-unlocks';
import type { Persistence } from '@/persistence/persistence';
import { HUD_THEME } from '../theme';
import { ModalShell } from '../primitives';

export interface AtelierScreenProps {
  /** The Persistence facade — modal reads + mutates meta state. */
  persistence: Persistence;
}

const CATEGORY_LABELS: Record<MetaUnlockCategory, string> = {
  'starting-units': 'Starting Units',
  'starting-buildings': 'Starting Buildings',
  'palette-skins': 'Palette Skins',
  'named-heroes': 'Named Heroes',
  'ai-bounties': 'AI Bounties',
  'lore-chapters': 'Lore Chapters',
  // M_V12.DEPTH.UPGRADE-PERSISTENCE — chain-starter unlocks
  // pre-purchase the tier-I head of one Discovery chain.
  'chain-starters': 'Chain Starters',
};

const buttonStyle: CSSProperties = {
  background: HUD_THEME.color.panel,
  color: HUD_THEME.color.text,
  border: `1px solid ${HUD_THEME.color.border}`,
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontFamily: HUD_THEME.font.body,
  cursor: 'pointer',
};

const disabledButtonStyle: CSSProperties = {
  ...buttonStyle,
  opacity: 0.5,
  cursor: 'not-allowed',
};

const unlockedButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: HUD_THEME.color.gold ?? '#e4b54b',
  color: HUD_THEME.color.gold ?? '#e4b54b',
  cursor: 'default',
};

export function AtelierScreen({ persistence }: AtelierScreenProps) {
  const [open, setOpen] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [tokens, setTokens] = useState(0);
  const [version, setVersion] = useState(0);

  // Listen for the open event.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('aethelgard:open-atelier', onOpen);
    return () => window.removeEventListener('aethelgard:open-atelier', onOpen);
  }, []);

  // Refresh meta state when the modal opens or after each unlock.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `version` is intentional — bumped after each unlock() to re-fetch the persisted state.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const [ids, bal] = await Promise.all([
        persistence.listMetaUnlocks(),
        persistence.getLoreTokens(),
      ]);
      if (cancelled) return;
      setUnlockedIds(new Set(ids));
      setTokens(bal);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, persistence, version]);

  const unlock = async (u: MetaUnlock) => {
    if (unlockedIds.has(u.id)) return;
    if (tokens < u.cost) return;
    // Spend tokens (debit) then write the unlock row. Each is
    // idempotent at the persistence layer; the debit uses a negative
    // earn for simplicity. If either fails the other can be reapplied
    // on next match-end without state corruption.
    await persistence.earnLoreTokens(-u.cost);
    await persistence.unlockMeta(u.id, u.cost);
    setVersion((v) => v + 1);
  };

  const grouped = metaUnlocksByCategory();
  const totalCount = Array.from(grouped.values()).reduce((s, arr) => s + arr.length, 0);
  const unlockedCount = unlockedIds.size;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <ModalShell width="min(720px, 94vw)" maxHeight="88vh" zIndex={130}>
        <Dialog.Title
          style={{
            fontSize: 20,
            color: HUD_THEME.color.text,
            marginBottom: 6,
            fontFamily: HUD_THEME.font.body,
          }}
        >
          The Atelier
        </Dialog.Title>
        <Dialog.Description
          style={{
            fontSize: 13,
            color: HUD_THEME.color.muted,
            marginBottom: 16,
            fontFamily: HUD_THEME.font.body,
          }}
        >
          Lore tokens earned from completed matches unlock permanent bonuses for every future match.
          Win on harder difficulties to earn more tokens per match.
        </Dialog.Description>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 18,
            padding: '10px 14px',
            background: 'rgba(228, 181, 75, 0.08)',
            border: '1px solid rgba(228, 181, 75, 0.4)',
            borderRadius: 8,
          }}
        >
          <span
            id="atelier-lore-token-balance"
            role="status"
            aria-label={`Lore token balance: ${tokens}`}
            style={{ color: HUD_THEME.color.gold ?? '#e4b54b', fontSize: 16, fontWeight: 700 }}
          >
            🜚 {tokens} Lore Tokens
          </span>
          <span style={{ color: HUD_THEME.color.muted, fontSize: 13 }}>
            {unlockedCount} / {totalCount} unlocked
          </span>
        </div>
        <section
          id="atelier-unlocks-list"
          aria-label="Meta unlocks list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            maxHeight: '64vh',
            overflowY: 'auto',
          }}
        >
          {Array.from(grouped.entries()).map(([cat, unlocks]) => (
            <section
              key={cat}
              id={`atelier-section-${cat}`}
              aria-label={`${CATEGORY_LABELS[cat]} section`}
            >
              <h3
                style={{
                  margin: '0 0 8px',
                  fontSize: 14,
                  color: HUD_THEME.color.accent,
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                }}
              >
                {CATEGORY_LABELS[cat]}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                {unlocks.map((u) => {
                  const isUnlocked = unlockedIds.has(u.id);
                  const canAfford = tokens >= u.cost;
                  return (
                    <li
                      key={u.id}
                      id={`atelier-row-${u.id}`}
                      aria-label={`Meta unlock row for ${u.name}`}
                      style={{
                        border: `1px solid ${HUD_THEME.color.border}`,
                        borderRadius: 8,
                        padding: 10,
                        background: HUD_THEME.color.panel,
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 12,
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                        <span
                          style={{
                            color: isUnlocked
                              ? (HUD_THEME.color.gold ?? '#e4b54b')
                              : HUD_THEME.color.text,
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {isUnlocked ? '✓ ' : ''}
                          {u.name}
                        </span>
                        <span style={{ color: HUD_THEME.color.muted, fontSize: 12 }}>
                          {u.description}
                        </span>
                      </div>
                      <button
                        type="button"
                        id={`atelier-unlock-${u.id}`}
                        aria-label={
                          isUnlocked
                            ? `Already unlocked: ${u.name}`
                            : canAfford
                              ? `Unlock ${u.name} for ${u.cost} lore tokens`
                              : `Locked: ${u.name} (need ${u.cost} lore tokens)`
                        }
                        disabled={isUnlocked || !canAfford}
                        onClick={() => unlock(u)}
                        style={
                          isUnlocked
                            ? unlockedButtonStyle
                            : canAfford
                              ? buttonStyle
                              : disabledButtonStyle
                        }
                      >
                        {isUnlocked ? 'Unlocked' : `🜚 ${u.cost}`}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </section>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <Dialog.Close asChild>
            <button
              type="button"
              id="atelier-modal-close"
              aria-label="Close Atelier"
              style={buttonStyle}
            >
              Close
            </button>
          </Dialog.Close>
        </div>
      </ModalShell>
    </Dialog.Root>
  );
}
