/**
 * M_V6.MYTH.EVENTS — runtime state machine for the rare myth events.
 *
 * Gate: shared MYTH_MIN_INTERVAL_SECONDS cooldown between any two
 * firings; at most one active event at a time. Picks an event with
 * weighted-random selection from the JSON registry.
 *
 * The effect dispatcher applies the event's gameplay impact (vision
 * range halving, meteor crash, herd spawn, etc). v0.6 substrate ships
 * the trigger pipeline + cooldown + active state + harvest-festival
 * (the simplest +50 food / +20 gold to every faction effect); the
 * other four event effects (meteor crash, eclipse vision change, herd
 * spawn, oracle reveal) wire into their respective subsystems in a
 * follow-up commit.
 */
import {
  MYTH_EVENT_IDS,
  MYTH_EVENTS,
  MYTH_MIN_INTERVAL_SECONDS,
  mythEventFor,
} from '@/config/myth-events';
import type { GameEconomy } from './economy';

/** The active myth-event state. */
export interface MythEventsState {
  /** Active event id + clock-second when it expires; null when none. */
  active: { id: string; expiresAtSeconds: number } | null;
  /** Clock-seconds of the last firing (any event). -1 = never. */
  lastFireSeconds: number;
}

export function createMythEventsState(): MythEventsState {
  return { active: null, lastFireSeconds: -1 };
}

/**
 * Read whether a new event can fire — requires the shared cooldown
 * has expired AND no event is currently active.
 */
export function canFireMythEvent(state: MythEventsState, nowSeconds: number): boolean {
  if (state.active) {
    if (nowSeconds < state.active.expiresAtSeconds) return false;
    // active event has expired; clear it inside the readiness check
    // so the next canFireMythEvent reads true cleanly.
    state.active = null;
  }
  if (state.lastFireSeconds < 0) return true;
  return nowSeconds >= state.lastFireSeconds + MYTH_MIN_INTERVAL_SECONDS;
}

/**
 * Pick an event id using weighted-random selection over MYTH_EVENT_IDS.
 * Returns null when the registry is empty (impossible given the Zod
 * schema gates min 1 entry, but defensive). The supplied `prng` is the
 * event-stream PRNG (`game.eventRng`).
 */
export function pickMythEvent(prng: () => number): string | null {
  if (MYTH_EVENT_IDS.length === 0) return null;
  let total = 0;
  for (const id of MYTH_EVENT_IDS) total += MYTH_EVENTS[id]?.weight ?? 0;
  if (total <= 0) return MYTH_EVENT_IDS[0] ?? null;
  let pick = prng() * total;
  for (const id of MYTH_EVENT_IDS) {
    pick -= MYTH_EVENTS[id]?.weight ?? 0;
    if (pick <= 0) return id;
  }
  return MYTH_EVENT_IDS[MYTH_EVENT_IDS.length - 1] ?? null;
}

/**
 * Fire a specific myth event. Mutates state.active + state.lastFireSeconds.
 * Returns the fired event id, or null when fire was rejected by the
 * cooldown / active gate.
 */
export function fireMythEvent(
  state: MythEventsState,
  id: string,
  nowSeconds: number,
): string | null {
  if (!canFireMythEvent(state, nowSeconds)) return null;
  const cfg = mythEventFor(id);
  state.active =
    cfg.durationSeconds > 0 ? { id, expiresAtSeconds: nowSeconds + cfg.durationSeconds } : null;
  state.lastFireSeconds = nowSeconds;
  return id;
}

/**
 * Apply the harvest-festival effect: every faction's economy gets
 * +50 food + +20 gold. Substrate for the dispatcher; other effects
 * (meteor / eclipse / migration / oracle) wire into their subsystems.
 */
export function applyHarvestFestival(
  ecoOf: (faction: string) => GameEconomy | undefined,
  factionIds: readonly string[],
): void {
  for (const f of factionIds) {
    const eco = ecoOf(f);
    if (!eco) continue;
    eco.food = (eco.food ?? 0) + 50;
    eco.gold = (eco.gold ?? 0) + 20;
  }
}
