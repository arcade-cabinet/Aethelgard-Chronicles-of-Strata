/**
 * M_V7.DIPLO.UI — non-aggression-pact accept/decline HUD pill.
 *
 * Reads `game.diplomacyProposals.pending` + renders one banner per
 * proposal TARGETING the local player faction (proposals from
 * `player` to others aren't shown — those are awaiting the other
 * faction's choice).
 *
 * Wires the v0.6 substrate primitives:
 *   - `proposeNonAggressionPact` (the AI / human initiates a proposal
 *     elsewhere; this UI only resolves them)
 *   - `acceptProposal` flips relation to ally + drops the entry
 *   - `rejectProposal` drops the entry silently
 *
 * Localfaction is hardcoded to 'player' for v0.7 substrate — the
 * single-player perspective. v0.8 spectator-mode + AIVAI mode would
 * widen to a faction-picker.
 */
import { useEffect, useState } from 'react';
import { findFaction } from '@/config/ai';
import { acceptProposal, type PendingProposal, rejectProposal } from '@/game/diplomacy-border';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from '../theme';

const LOCAL_FACTION = 'player';

export interface NonAggressionPactPillProps {
  game: GameState;
  /** Polling cadence in ms; tests can override to 0 for synchronous. */
  pollIntervalMs?: number;
}

export function NonAggressionPactPill({ game, pollIntervalMs = 200 }: NonAggressionPactPillProps) {
  // Re-render when the pending list changes. Polling > subscribing
  // because the diplomacy substrate doesn't (yet) expose a change
  // event; v0.8 may add one.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (pollIntervalMs <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);
  void tick;

  const targeted = game.diplomacyProposals.pending.filter((p) => p.target === LOCAL_FACTION);
  if (targeted.length === 0) return null;

  return (
    <div
      data-testid="non-aggression-pact-stack"
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0) + 56px)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'none',
        zIndex: 60,
      }}
    >
      {targeted.map((p) => (
        <PactBanner key={`${p.proposer}|${p.target}`} game={game} proposal={p} />
      ))}
    </div>
  );
}

function PactBanner({ game, proposal }: { game: GameState; proposal: PendingProposal }) {
  const proposerColor = findFaction(game.factions, proposal.proposer)?.color ?? '#94a3b8';
  const proposerName =
    findFaction(game.factions, proposal.proposer)?.displayName ?? proposal.proposer;

  const onAccept = () => {
    acceptProposal(
      game.diplomacyProposals,
      game.diplomacy,
      proposal.proposer,
      proposal.target,
      game.clock.elapsed,
    );
  };
  const onReject = () => {
    rejectProposal(game.diplomacyProposals, proposal.proposer, proposal.target);
  };

  return (
    <div
      data-testid={`non-aggression-pact-${proposal.proposer}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 14px',
        borderRadius: 10,
        background: 'rgba(15, 23, 42, 0.92)',
        border: `1px solid ${proposerColor}`,
        color: '#fff',
        fontFamily: HUD_THEME.font.body,
        fontSize: 13,
        pointerEvents: 'auto',
        boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          background: proposerColor,
          flexShrink: 0,
        }}
      />
      <span style={{ whiteSpace: 'nowrap' }}>
        <strong>{proposerName}</strong> proposes non-aggression pact
      </span>
      <button
        type="button"
        data-testid={`non-aggression-pact-${proposal.proposer}-accept`}
        onClick={onAccept}
        style={{
          padding: '4px 10px',
          borderRadius: 6,
          background: 'rgba(34, 197, 94, 0.85)',
          border: 'none',
          color: '#fff',
          fontFamily: HUD_THEME.font.body,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Accept
      </button>
      <button
        type="button"
        data-testid={`non-aggression-pact-${proposal.proposer}-reject`}
        onClick={onReject}
        style={{
          padding: '4px 10px',
          borderRadius: 6,
          background: 'rgba(239, 68, 68, 0.85)',
          border: 'none',
          color: '#fff',
          fontFamily: HUD_THEME.font.body,
          fontSize: 12,
          cursor: 'pointer',
        }}
      >
        Decline
      </button>
    </div>
  );
}
