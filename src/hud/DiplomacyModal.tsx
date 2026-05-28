/**
 * M_V11.HUD.DIPLOMACY-MODAL — player-facing diplomacy modal.
 *
 * User feedback: "AI is purely confrontational but there is NO
 * diplomacy modal and no way to ally against another AI temporarily
 * and so on."
 *
 * Before this modal the diplomacy substrate (proposeNonAggressionPact /
 * acceptProposal / canDemandTribute / refuseTribute / acceptTribute /
 * setRelation) was AI-only. The player had no UI to engage with it.
 *
 * The modal lists every NON-player faction the player has had contact
 * with (via hasHadContact — that gate is what the M_V11.EVENTS.RTS-
 * TRIGGERED change introduced for tribute). Per faction the player
 * sees the current relation status, the supply/territory snapshot,
 * and a set of action buttons:
 *
 *   - **Propose Pact**       → only when relation is 'neutral'.
 *                              Flips to 'ally' on acceptance.
 *   - **Declare War**        → from any relation other than 'enemy'.
 *                              Immediate flip; ends pact / alliance.
 *   - **Break Pact**         → from 'ally'. Returns to 'neutral'.
 *   - **Demand Tribute**     → when canDemandTribute(myEco, theirEco).
 *                              On accept they become tributary; on
 *                              refuse, they flip to 'enemy'.
 *   - **Pay Tribute**        → when canDemandTribute(theirEco, myEco).
 *                              The player concedes 10% per-tick to
 *                              avoid an immediate war.
 *
 * All buttons carry id= + aria-label so the Maestro mobile e2e
 * battery can tap them. The modal is opened from a HUD button (this
 * file just exports the modal — wiring into HUD lives in HUDOverlay /
 * BottomBar in a separate commit).
 */
import * as Dialog from '@radix-ui/react-dialog';
import { type CSSProperties, useEffect, useMemo, useState } from 'react';
import type { FactionId } from '@/config/factions';
import { type DiplomacyState, getRelation, getRelationEntry, setRelation } from '@/game/diplomacy';
import {
  acceptProposal,
  type DiplomacyProposalState,
  proposeNonAggressionPact,
  rejectProposal,
} from '@/game/diplomacy-border';
import {
  acceptTribute,
  canDemandTribute,
  hasHadContact,
  refuseTribute,
} from '@/game/diplomacy-tribute';
import type { GameEconomy } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './theme';
import { ModalShell } from './ModalShell';

const PLAYER: FactionId = 'player';

export interface DiplomacyModalProps {
  /** The live game state — modal reads + mutates diplomacy / proposals. */
  game: GameState;
}

interface FactionRow {
  id: FactionId;
  displayName: string;
  relation: ReturnType<typeof getRelation>;
  contact: boolean;
  myEco: GameEconomy;
  theirEco: GameEconomy;
  /** Pending proposal initiated by player against this faction (if any). */
  outgoingProposal: boolean;
  /** Pending proposal where THIS faction is asking the player (we accept/reject). */
  incomingProposal: boolean;
  /** Remaining sim-seconds before a timed alliance expires (null = permanent or non-ally). */
  allianceRemainingSeconds: number | null;
}

function buildRows(game: GameState): FactionRow[] {
  const rows: FactionRow[] = [];
  for (const fc of game.factions) {
    if (fc.id === PLAYER) continue;
    const myEco = game.economy[PLAYER as 'player'];
    const theirEco = game.economy[fc.id as 'enemy'];
    if (!myEco || !theirEco) continue;
    const outgoing = game.diplomacyProposals.pending.some(
      (p) => p.proposer === PLAYER && p.target === fc.id,
    );
    const incoming = game.diplomacyProposals.pending.some(
      (p) => p.proposer === fc.id && p.target === PLAYER,
    );
    // A pending proposal counts as contact even if relation is 'neutral'
    // (neutral relations don't have a row in the diplomacy map, but
    // an in-flight proposal proves the two factions know each other).
    const contact = hasHadContact(game.diplomacy, PLAYER, fc.id) || outgoing || incoming;
    const entry = getRelationEntry(game.diplomacy, PLAYER, fc.id);
    const remaining =
      entry?.relation === 'ally' && entry.expiresAtSeconds !== undefined
        ? Math.max(0, entry.expiresAtSeconds - game.clock.elapsed)
        : null;
    rows.push({
      id: fc.id,
      displayName: fc.displayName,
      relation: getRelation(game.diplomacy, PLAYER, fc.id),
      contact,
      myEco,
      theirEco,
      outgoingProposal: outgoing,
      incomingProposal: incoming,
      allianceRemainingSeconds: remaining,
    });
  }
  return rows;
}

function relationColor(rel: ReturnType<typeof getRelation>): string {
  switch (rel) {
    case 'ally':
      return '#52d273';
    case 'enemy':
      return '#e95252';
    case 'tributary':
      return '#e4b54b';
    default:
      return '#94a3b8';
  }
}

const buttonStyle: CSSProperties = {
  background: HUD_THEME.color.panel,
  color: HUD_THEME.color.text,
  border: `1px solid ${HUD_THEME.color.border}`,
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  fontFamily: HUD_THEME.font.body,
  cursor: 'pointer',
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  borderColor: '#e95252',
  color: '#e95252',
};

export function DiplomacyModal({ game }: DiplomacyModalProps) {
  const [open, setOpen] = useState(false);
  // CodeRabbit (PR #89): include version in row memo deps so each
  // bump() after an action mutates the diplomacy substrate in place,
  // the next memo recomputation actually re-runs buildRows(game)
  // against the post-mutation state.
  const [version, setVersion] = useState(0);
  const bump = () => setVersion((v) => v + 1);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('aethelgard:open-diplomacy', onOpen);
    return () => window.removeEventListener('aethelgard:open-diplomacy', onOpen);
  }, []);
  // `open` recomputes when the modal opens; `version` is bumped after
  // each action so the post-mutation state reflects immediately.
  // biome-ignore lint/correctness/useExhaustiveDependencies: open + version are intentional deps; buildRows reads game in place.
  const rows = useMemo(() => buildRows(game), [game, open, version]);

  // CodeRabbit (PR #89): read game.clock.elapsed inside each handler so
  // a modal that has been open for a while uses the LATEST sim time
  // when the player acts. Capturing `now` at render-time backdates
  // proposals + alliance expiry by however long the modal sat open.
  const propose = (fc: FactionId) => {
    const now = game.clock.elapsed;
    proposeNonAggressionPact(game.diplomacyProposals, game.diplomacy, PLAYER, fc, now);
    bump();
  };
  const accept = (fc: FactionId) => {
    // M_V11.DIPLO.TEMP-ALLIANCE — default to a 5-minute timed
    // alliance so the player can opt INTO an ally-of-convenience
    // play without locking themselves into a permanent pact. The
    // alliance auto-expires via tickAllianceExpiry; the player can
    // also Break Pact early.
    const now = game.clock.elapsed;
    acceptProposal(game.diplomacyProposals, game.diplomacy, fc, PLAYER, now);
    // acceptProposal sets relation 'ally' with no expiry — overwrite
    // with the same relation + an expiry stamp.
    setRelation(game.diplomacy, fc, PLAYER, 'ally', now, null, now + 5 * 60);
    bump();
  };
  const reject = (fc: FactionId) => {
    rejectProposal(game.diplomacyProposals, fc, PLAYER);
    bump();
  };
  const declareWar = (fc: FactionId) => {
    const now = game.clock.elapsed;
    setRelation(game.diplomacy, PLAYER, fc, 'enemy', now);
    bump();
  };
  const breakPact = (fc: FactionId) => {
    const now = game.clock.elapsed;
    setRelation(game.diplomacy, PLAYER, fc, 'neutral', now);
    bump();
  };
  const demandTribute = (fc: FactionId) => {
    const now = game.clock.elapsed;
    acceptTribute(game.diplomacy, fc, PLAYER, now);
    bump();
  };
  const payTribute = (fc: FactionId) => {
    const now = game.clock.elapsed;
    acceptTribute(game.diplomacy, PLAYER, fc, now);
    bump();
  };
  const refuse = (fc: FactionId) => {
    const now = game.clock.elapsed;
    refuseTribute(game.diplomacy, PLAYER, fc, now);
    bump();
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <ModalShell width="min(640px, 92vw)" maxHeight="86vh" zIndex={120}>
        <Dialog.Title
          style={{
            fontSize: 18,
            color: HUD_THEME.color.text,
            marginBottom: 14,
            fontFamily: HUD_THEME.font.body,
          }}
        >
          Diplomacy
        </Dialog.Title>
        <Dialog.Description
          style={{
            fontSize: 13,
            color: HUD_THEME.color.muted,
            marginBottom: 18,
            fontFamily: HUD_THEME.font.body,
          }}
        >
          Propose pacts, demand tribute, declare war. Temporary alliances let you team up against
          the strongest opponent — and break the alliance when convenient.
        </Dialog.Description>
        <ul
          id="diplomacy-modal-faction-list"
          aria-label="Diplomacy faction list"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            listStyle: 'none',
            padding: 0,
            margin: 0,
          }}
        >
          {rows.length === 0 && (
            <li style={{ color: HUD_THEME.color.muted, fontSize: 13 }}>
              No other factions in this match.
            </li>
          )}
          {rows.map((row) => (
            <li
              key={row.id}
              id={`diplomacy-row-${row.id}`}
              aria-label={`Diplomacy row for ${row.displayName}`}
              style={{
                border: `1px solid ${HUD_THEME.color.border}`,
                borderRadius: 8,
                padding: 12,
                background: HUD_THEME.color.panel,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ color: HUD_THEME.color.text, fontSize: 15, fontWeight: 600 }}>
                    {row.displayName}
                  </span>
                  <span
                    style={{
                      color: relationColor(row.relation),
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: 0.6,
                    }}
                  >
                    {row.contact ? row.relation : 'unknown'}
                    {row.allianceRemainingSeconds !== null && (
                      <span style={{ color: HUD_THEME.color.muted, marginLeft: 8 }}>
                        · {Math.floor(row.allianceRemainingSeconds / 60)}m{' '}
                        {Math.floor(row.allianceRemainingSeconds % 60)
                          .toString()
                          .padStart(2, '0')}
                        s left
                      </span>
                    )}
                  </span>
                </div>
                <div style={{ color: HUD_THEME.color.muted, fontSize: 12 }}>
                  supply {row.theirEco.usedSupply}
                </div>
              </div>
              {!row.contact && (
                <div style={{ color: HUD_THEME.color.muted, fontSize: 12 }}>
                  Your scouts haven't found their kingdom yet. Diplomacy unlocks on first contact.
                </div>
              )}
              {row.contact && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {row.incomingProposal && (
                    <>
                      <button
                        type="button"
                        id={`diplomacy-accept-${row.id}`}
                        aria-label={`Accept proposal from ${row.displayName}`}
                        style={buttonStyle}
                        onClick={() => accept(row.id)}
                      >
                        Accept Pact
                      </button>
                      <button
                        type="button"
                        id={`diplomacy-reject-${row.id}`}
                        aria-label={`Reject proposal from ${row.displayName}`}
                        style={dangerButtonStyle}
                        onClick={() => reject(row.id)}
                      >
                        Reject
                      </button>
                    </>
                  )}
                  {!row.incomingProposal && row.relation === 'neutral' && !row.outgoingProposal && (
                    <button
                      type="button"
                      id={`diplomacy-propose-${row.id}`}
                      aria-label={`Propose pact with ${row.displayName}`}
                      style={buttonStyle}
                      onClick={() => propose(row.id)}
                    >
                      Propose Pact
                    </button>
                  )}
                  {row.outgoingProposal && (
                    <span style={{ color: HUD_THEME.color.muted, fontSize: 12 }}>
                      Proposal sent, awaiting reply…
                    </span>
                  )}
                  {row.relation === 'ally' && (
                    <button
                      type="button"
                      id={`diplomacy-break-${row.id}`}
                      aria-label={`Break pact with ${row.displayName}`}
                      style={dangerButtonStyle}
                      onClick={() => breakPact(row.id)}
                    >
                      Break Pact
                    </button>
                  )}
                  {row.relation !== 'enemy' && (
                    <button
                      type="button"
                      id={`diplomacy-war-${row.id}`}
                      aria-label={`Declare war on ${row.displayName}`}
                      style={dangerButtonStyle}
                      onClick={() => declareWar(row.id)}
                    >
                      Declare War
                    </button>
                  )}
                  {row.relation !== 'tributary' &&
                    canDemandTribute(row.myEco, row.theirEco, () => true) && (
                      <button
                        type="button"
                        id={`diplomacy-demand-${row.id}`}
                        aria-label={`Demand tribute from ${row.displayName}`}
                        style={buttonStyle}
                        onClick={() => demandTribute(row.id)}
                      >
                        Demand Tribute
                      </button>
                    )}
                  {row.relation !== 'tributary' &&
                    canDemandTribute(row.theirEco, row.myEco, () => true) && (
                      <>
                        <button
                          type="button"
                          id={`diplomacy-pay-${row.id}`}
                          aria-label={`Pay tribute to ${row.displayName}`}
                          style={buttonStyle}
                          onClick={() => payTribute(row.id)}
                        >
                          Pay Tribute
                        </button>
                        <button
                          type="button"
                          id={`diplomacy-refuse-${row.id}`}
                          aria-label={`Refuse tribute to ${row.displayName}`}
                          style={dangerButtonStyle}
                          onClick={() => refuse(row.id)}
                        >
                          Refuse
                        </button>
                      </>
                    )}
                </div>
              )}
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
          <Dialog.Close asChild>
            <button
              type="button"
              id="diplomacy-modal-close"
              aria-label="Close diplomacy modal"
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

export type { DiplomacyState, DiplomacyProposalState };
