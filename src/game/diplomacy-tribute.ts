/**
 * M_V6.DIPLO.TRIBUTE — automatic tribute demand + cession pipeline.
 *
 * Per the v0.6 directive §2(c): "a clearly-stronger faction
 * (≥2× supply + active military advantage) can demand tribute from a
 * weaker faction; refusal triggers an automatic wave-of-attack." On
 * acceptance the tributary cedes 10% of per-second resource accrual
 * to the dominant faction.
 *
 * The HUD pill UI for the demand is a follow-up polish item; the
 * primitives below are the substrate for both the demand-issuance
 * detector AND the per-tick cession mutation.
 */
import type { FactionId } from '@/config/factions';
import { type DiplomacyState, relationKey, setRelation, tributaryDominant } from './diplomacy';
import { addResource, type GameEconomy } from './economy';

/** Supply ratio threshold for a clearly-stronger faction. */
export const TRIBUTE_DEMAND_RATIO = 2.0;
/** Fraction of per-second resource accrual the tributary cedes. */
export const TRIBUTE_CESSION_FRACTION = 0.1;

/**
 * Returns true when `dominant` may demand tribute from `weaker`. Two
 * conditions:
 *  - Supply ratio >= TRIBUTE_DEMAND_RATIO AND dominant has active
 *    military (peakSupply > 0 implies any unit was ever trained).
 *  - HAS-HAD-CONTACT: the two factions must have had at least one
 *    prior diplomatic interaction (a relation entry in the diplomacy
 *    map). Lore: you can't demand tribute from a kingdom you've never
 *    met. The first real interaction (border friction creating a
 *    relation row, an alliance offer, OR the initial scouting flag
 *    set by the contact path) must happen first.
 *
 * Both economies are GameEconomy refs; the legacy 2-faction Record-
 * keyed economy is the supported caller today.
 *
 * If `contactCheck` is supplied, also gates on it returning true —
 * callers that have a DiplomacyState use the [[hasHadContact]] helper.
 * Callers that don't (legacy 2-faction tests) can omit it.
 */
export function canDemandTribute(
  dominant: GameEconomy,
  weaker: GameEconomy,
  contactCheck?: () => boolean,
): boolean {
  if (dominant.peakSupply <= 0) return false;
  if (contactCheck && !contactCheck()) return false;
  if (weaker.usedSupply <= 0) return dominant.usedSupply > 0;
  return dominant.usedSupply >= weaker.usedSupply * TRIBUTE_DEMAND_RATIO;
}

/**
 * Has-had-contact gate for tribute (and other diplomacy actions). Two
 * factions are considered to have had contact iff there's a relation
 * row for the pair in `diplomacy.relations`. The row is created the
 * first time a real interaction lands (border friction, alliance
 * proposal, etc.) — its mere presence (even at 'neutral') is the
 * narrative "they know each other exists" flag.
 */
export function hasHadContact(diplomacy: DiplomacyState, a: FactionId, b: FactionId): boolean {
  // Use the canonical relationKey helper so the sorted-pair convention
  // stays single-source (was duplicated inline; CodeRabbit PR #89).
  return diplomacy.relations.has(relationKey(a, b));
}

/**
 * Mark a faction pair as tributary — `tributary` faction will cede
 * resources to `dominant` per tick. Stamps sinceClockSeconds.
 */
export function acceptTribute(
  diplomacy: DiplomacyState,
  tributary: FactionId,
  dominant: FactionId,
  nowSeconds: number,
): void {
  setRelation(diplomacy, tributary, dominant, 'tributary', nowSeconds, dominant);
}

/**
 * Refuse a tribute demand — flips to 'enemy' so the dominant faction's
 * AI may launch a wave-of-attack. The flip is symmetric (a + b sorted-
 * key); the dominant arg is recorded for telemetry only.
 */
export function refuseTribute(
  diplomacy: DiplomacyState,
  refuser: FactionId,
  demander: FactionId,
  nowSeconds: number,
): void {
  setRelation(diplomacy, refuser, demander, 'enemy', nowSeconds);
}

/**
 * Per-tick cession: for every tributary pair, drain TRIBUTE_CESSION_FRACTION
 * of the tributary's CURRENT resource pile and deposit it into the
 * dominant's pile. v0.6 substrate keys both ends by legacy `'player'`
 * | `'enemy'` ids (the Record<Faction, GameEconomy> hasn't yet migrated
 * to a registry-keyed map); N-player tribute flows lift to that when
 * GameEconomy itself does.
 *
 * Only wood / stone / gold are tributable per the directive (food /
 * peat / science / mana are local-economy concerns, not foreign
 * tribute material).
 *
 * `ecoOf` is the same callback shape as performTrade — caller supplies
 * the lookup so tests can stub a registry-keyed eco lookup.
 *
 * Returns the count of cession events fired (one per tributable pair
 * per tick) for telemetry.
 */
export function tickTributeCession(
  diplomacy: DiplomacyState,
  factionIds: readonly FactionId[],
  ecoOf: (faction: FactionId) => GameEconomy | undefined,
  delta: number,
): number {
  if (delta <= 0) return 0;
  let fired = 0;
  // Per-pair: scan unique (a, b) pairs and check tributaryDominant.
  for (let i = 0; i < factionIds.length; i++) {
    for (let j = i + 1; j < factionIds.length; j++) {
      const a = factionIds[i] as FactionId;
      const b = factionIds[j] as FactionId;
      const dom = tributaryDominant(diplomacy, a, b);
      if (!dom) continue;
      const tributary = dom === a ? b : a;
      const ecoT = ecoOf(tributary);
      const ecoD = ecoOf(dom);
      if (!ecoT || !ecoD) continue;
      for (const slot of ['wood', 'stone', 'gold'] as const) {
        const cede = Math.floor(ecoT[slot] * TRIBUTE_CESSION_FRACTION * delta);
        if (cede <= 0) continue;
        ecoT[slot] -= cede;
        addResource(ecoD, slot, cede);
      }
      fired += 1;
    }
  }
  return fired;
}
