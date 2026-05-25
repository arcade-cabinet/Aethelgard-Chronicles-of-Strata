/**
 * M_V6.DIPLO.BORDER-ASK — detect border-touching between factions +
 * model the 10s acceptance window for non-aggression pact proposals.
 *
 * Architecture:
 *   - bordersAreTouching(zoneA, zoneB) — returns true when any tile in
 *     zoneA.controlled has a hex neighbour in zoneB.controlled. Pure;
 *     no PRNG, no game state mutation.
 *   - PendingProposal — a non-aggression-pact proposal in flight.
 *     Carries proposer + target + expiry clock-seconds. The UI watches
 *     the list to render the HUD pill; the runtime expires entries
 *     via `expireProposals(state, nowSeconds)`.
 *   - acceptProposal flips relation to 'ally'; rejectProposal /
 *     expireProposals drop the entry silently (no relation change).
 *
 * v0.6 substrate ships the detection + state + tests. The HUD pill UI
 * (Radix popover with accept / reject) wires the same primitives in a
 * follow-up commit if not landed within the same work-unit.
 */
import { getHexKey, hexNeighbors } from '@/core/hex';
import type { FactionId } from '@/config/factions';
import type { ZoneState } from '@/game/zone';
import { type DiplomacyState, getRelation, setRelation } from './diplomacy';

/** Seconds the proposal stays open before auto-expiry. */
export const PROPOSAL_ACCEPTANCE_WINDOW_SECONDS = 10;

export interface PendingProposal {
  /** Faction that issued the proposal. */
  proposer: FactionId;
  /** Faction being asked to accept. */
  target: FactionId;
  /** Clock-seconds at which the proposal auto-expires (no answer = reject). */
  expiresAtSeconds: number;
}

/**
 * State module: pending diplomacy proposals. v0.6 surfaces non-aggression
 * pacts only; v0.7 may add trade-route / military-alliance variants.
 */
export interface DiplomacyProposalState {
  pending: PendingProposal[];
}

export function createDiplomacyProposalState(): DiplomacyProposalState {
  return { pending: [] };
}

/**
 * Returns true when any tile in zoneA's controlled set has a hex
 * neighbour in zoneB's controlled set. Pure read; O(zoneA.size * 6).
 *
 * The "touch" check is the standard adjacency definition (shared hex
 * edge between two controlled tiles in different zones); diagonal-only
 * touches (corner-only) don't count — those rarely produce a UX-meaningful
 * border the player would interpret as "adjacent realms."
 */
export function bordersAreTouching(zoneA: ZoneState, zoneB: ZoneState): boolean {
  for (const key of zoneA.controlled) {
    const [qStr, rStr] = key.split(',');
    if (qStr === undefined || rStr === undefined) continue;
    const q = Number.parseInt(qStr, 10);
    const r = Number.parseInt(rStr, 10);
    if (!Number.isFinite(q) || !Number.isFinite(r)) continue;
    for (const nKey of hexNeighbors(q, r)) {
      if (zoneB.controlled.has(nKey)) return true;
    }
  }
  return false;
}

/**
 * Propose a non-aggression pact. Adds a PendingProposal with a 10s
 * acceptance window. Validates: same-id rejected, already-enemy rejected
 * (can't pact during active war), duplicate proposal rejected.
 *
 * Returns the created proposal or null on validation failure.
 */
export function proposeNonAggressionPact(
  proposals: DiplomacyProposalState,
  diplomacy: DiplomacyState,
  proposer: FactionId,
  target: FactionId,
  nowSeconds: number,
): PendingProposal | null {
  if (proposer === target) return null;
  const rel = getRelation(diplomacy, proposer, target);
  if (rel === 'enemy' || rel === 'ally') return null;
  // duplicate?
  for (const p of proposals.pending) {
    if (p.proposer === proposer && p.target === target) return null;
    if (p.proposer === target && p.target === proposer) return null;
  }
  const proposal: PendingProposal = {
    proposer,
    target,
    expiresAtSeconds: nowSeconds + PROPOSAL_ACCEPTANCE_WINDOW_SECONDS,
  };
  proposals.pending.push(proposal);
  return proposal;
}

/**
 * Accept a pending proposal — flips diplomacy to 'ally' for the pair
 * and drops the proposal. Validates the (proposer, target) pair has a
 * pending entry. Returns true on success, false on missing entry.
 */
export function acceptProposal(
  proposals: DiplomacyProposalState,
  diplomacy: DiplomacyState,
  proposer: FactionId,
  target: FactionId,
  nowSeconds: number,
): boolean {
  const idx = proposals.pending.findIndex((p) => p.proposer === proposer && p.target === target);
  if (idx < 0) return false;
  proposals.pending.splice(idx, 1);
  setRelation(diplomacy, proposer, target, 'ally', nowSeconds);
  return true;
}

/**
 * Reject a pending proposal — drops the entry without changing the
 * relation. (Default decline path; per-faction policy may choose to
 * reject + escalate to enemy, which is the BORDER-ASK + TRIBUTE
 * spec's wave-of-attack penalty hook.) Returns true if found.
 */
export function rejectProposal(
  proposals: DiplomacyProposalState,
  proposer: FactionId,
  target: FactionId,
): boolean {
  const idx = proposals.pending.findIndex((p) => p.proposer === proposer && p.target === target);
  if (idx < 0) return false;
  proposals.pending.splice(idx, 1);
  return true;
}

/**
 * Sweep expired proposals — silently drops entries whose expiresAtSeconds
 * has passed. Called from the per-tick runtime (e.g. tickClockPhase).
 * Returns the count of dropped entries (for telemetry / HUD update).
 */
export function expireProposals(proposals: DiplomacyProposalState, nowSeconds: number): number {
  let dropped = 0;
  for (let i = proposals.pending.length - 1; i >= 0; i--) {
    const p = proposals.pending[i] as PendingProposal;
    if (nowSeconds >= p.expiresAtSeconds) {
      proposals.pending.splice(i, 1);
      dropped += 1;
    }
  }
  return dropped;
}

/** Return any pending proposal for the given (proposer, target) pair. */
export function findProposal(
  proposals: DiplomacyProposalState,
  proposer: FactionId,
  target: FactionId,
): PendingProposal | undefined {
  return proposals.pending.find((p) => p.proposer === proposer && p.target === target);
}

// Helper for the renderer (border-touch tile keys aren't exported by the
// detection function — getHexKey re-export keeps callers from re-importing).
export { getHexKey };
