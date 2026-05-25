/**
 * M_V6.DIPLO.BORDER-ASK — border-touch detection + proposal lifecycle.
 *
 * Pins:
 *   1. bordersAreTouching detects adjacent tiles across zones.
 *   2. Disjoint zones return false.
 *   3. proposeNonAggressionPact creates a 10s-window entry.
 *   4. Duplicate proposals are rejected.
 *   5. Same-id / already-enemy / already-ally proposals are rejected.
 *   6. acceptProposal flips diplomacy to 'ally' + drops the entry.
 *   7. rejectProposal drops the entry without changing diplomacy.
 *   8. expireProposals sweeps entries past expiry.
 *   9. GameState starts with empty proposals.
 */
import { describe, expect, it } from 'vitest';
import { createZoneState } from '@/game/zone';
import { startGame } from '@/game/game-state';
import { createDiplomacyState, getRelation, setRelation } from '@/game/diplomacy';
import {
  acceptProposal,
  bordersAreTouching,
  createDiplomacyProposalState,
  expireProposals,
  findProposal,
  PROPOSAL_ACCEPTANCE_WINDOW_SECONDS,
  proposeNonAggressionPact,
  rejectProposal,
} from '@/game/diplomacy-border';

describe('bordersAreTouching', () => {
  it('returns true when two zones share an edge', () => {
    const a = createZoneState();
    const b = createZoneState();
    // a controls (0,0); b controls (1,0). Hex neighbours.
    a.controlled.add('0,0');
    b.controlled.add('1,0');
    expect(bordersAreTouching(a, b)).toBe(true);
  });

  it('returns false for disjoint zones', () => {
    const a = createZoneState();
    const b = createZoneState();
    a.controlled.add('0,0');
    b.controlled.add('5,5');
    expect(bordersAreTouching(a, b)).toBe(false);
  });

  it('returns false for two empty zones', () => {
    expect(bordersAreTouching(createZoneState(), createZoneState())).toBe(false);
  });
});

describe('proposeNonAggressionPact lifecycle', () => {
  it('creates a proposal with the 10s acceptance window', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    const p = proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100);
    expect(p).not.toBeNull();
    expect(p?.expiresAtSeconds).toBe(100 + PROPOSAL_ACCEPTANCE_WINDOW_SECONDS);
    expect(proposals.pending).toHaveLength(1);
  });

  it('rejects duplicate proposals (both directions)', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    expect(proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100)).not.toBeNull();
    expect(proposeNonAggressionPact(proposals, d, 'player', 'enemy', 101)).toBeNull();
    expect(proposeNonAggressionPact(proposals, d, 'enemy', 'player', 102)).toBeNull();
    expect(proposals.pending).toHaveLength(1);
  });

  it('rejects same-id / already-enemy / already-ally proposals', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    expect(proposeNonAggressionPact(proposals, d, 'player', 'player', 0)).toBeNull();
    setRelation(d, 'player', 'enemy', 'enemy', 0);
    expect(proposeNonAggressionPact(proposals, d, 'player', 'enemy', 1)).toBeNull();
    setRelation(d, 'player', 'enemy', 'ally', 2);
    expect(proposeNonAggressionPact(proposals, d, 'player', 'enemy', 3)).toBeNull();
  });
});

describe('acceptProposal / rejectProposal', () => {
  it('acceptProposal flips relation to ally + drops the entry', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100);
    expect(acceptProposal(proposals, d, 'player', 'enemy', 105)).toBe(true);
    expect(getRelation(d, 'player', 'enemy')).toBe('ally');
    expect(proposals.pending).toHaveLength(0);
  });

  it('rejectProposal drops entry but leaves diplomacy alone', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100);
    expect(rejectProposal(proposals, 'player', 'enemy')).toBe(true);
    expect(getRelation(d, 'player', 'enemy')).toBe('neutral');
    expect(proposals.pending).toHaveLength(0);
  });

  it('accept / reject on a missing entry returns false (no throw)', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    expect(acceptProposal(proposals, d, 'player', 'enemy', 100)).toBe(false);
    expect(rejectProposal(proposals, 'player', 'enemy')).toBe(false);
  });
});

describe('expireProposals', () => {
  it('drops entries whose expiry has passed', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100); // expires at 110
    proposeNonAggressionPact(proposals, d, 'player-3', 'enemy', 105); // expires at 115
    // At t=112, only the first should expire.
    const droppedAt112 = expireProposals(proposals, 112);
    expect(droppedAt112).toBe(1);
    expect(proposals.pending).toHaveLength(1);
    // At t=115, the second hits expiry (>=).
    const droppedAt115 = expireProposals(proposals, 115);
    expect(droppedAt115).toBe(1);
    expect(proposals.pending).toHaveLength(0);
  });

  it('expires zero when nothing past expiry', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100);
    expect(expireProposals(proposals, 105)).toBe(0);
  });

  it('findProposal returns the pending entry', () => {
    const proposals = createDiplomacyProposalState();
    const d = createDiplomacyState();
    proposeNonAggressionPact(proposals, d, 'player', 'enemy', 100);
    expect(findProposal(proposals, 'player', 'enemy')?.proposer).toBe('player');
    expect(findProposal(proposals, 'enemy', 'player')).toBeUndefined(); // direction-sensitive
  });
});

describe('GameState wiring', () => {
  it('startGame initializes empty diplomacyProposals', () => {
    const game = startGame({
      seedPhrase: 'alpha-bravo-charlie',
      mapSize: 8,
      difficulty: 'normal',
      eventSeed: 'evt',
    });
    expect(game.diplomacyProposals.pending).toEqual([]);
  });
});
