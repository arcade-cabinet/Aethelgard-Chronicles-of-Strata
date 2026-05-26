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
 *
 * M_V7.MYTH.EFFECTS (LOW-3) — gracefully reject unknown event ids
 * instead of throwing. A typo in the random-events dispatcher would
 * have crashed runEconomyTick mid-tick before this guard.
 */
/**
 * M_V11.NOTIF.MYTH-EVENT — Chronicler-voice quote per event id,
 * sourced verbatim from `docs/lore/myth-events.md`. Surfaced in
 * the toast emitted from `fireMythEvent` so the player gets the
 * in-fiction explanation, not just a mechanical effect.
 */
const MYTH_EVENT_FLAVOR: Record<string, string> = {
  'solar-eclipse': 'The 7th day of the year was given to the night. Our archers blessed the dark.',
  'meteor-strike': 'A piece of the sky fell on the Pass; we built a shrine where it landed.',
  'wildlife-migration': 'The Verdant sent its herd through our valleys. The peons ate well.',
  'oracle-vision': 'The Mythic spoke to one of our scribes. She has not slept since.',
  'harvest-festival': 'The strata gave one good year. We did not waste it.',
};

export function fireMythEvent(
  state: MythEventsState,
  id: string,
  nowSeconds: number,
): string | null {
  if (!MYTH_EVENT_IDS.includes(id)) return null;
  if (!canFireMythEvent(state, nowSeconds)) return null;
  const cfg = mythEventFor(id);
  state.active =
    cfg.durationSeconds > 0 ? { id, expiresAtSeconds: nowSeconds + cfg.durationSeconds } : null;
  state.lastFireSeconds = nowSeconds;
  // M_V11.NOTIF.MYTH-EVENT — Chronicler-voice toast on every MYTH
  // event fire. Per-event dedup id so a re-fire (which can happen
  // for non-active events like harvest-festival) gets a fresh
  // toast slot rather than replacing an older one of a different
  // event. Focus omitted — most MYTH events are realm-wide, not
  // tile-scoped.
  if (typeof window !== 'undefined') {
    const flavor = MYTH_EVENT_FLAVOR[id] ?? '';
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: `myth-event-${id}-${Math.floor(nowSeconds)}`,
          tone: 'warning',
          title: `The strata speak — ${id.replace(/-/g, ' ')}`,
          description: flavor,
        },
      }),
    );
  }
  return id;
}

/**
 * Apply the harvest-festival effect: every faction's economy gets
 * +50 food + +20 gold.
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

/**
 * M_V7.MYTH.EFFECTS — meteor-strike: picks a random walkable tile,
 * places a wildfire on a FOREST tile (igniteWildfire requires FOREST
 * to spread the flame; meteor falls on a forest or harmlessly on
 * non-FOREST), and damages every entity on the chosen tile by 30 HP.
 *
 * Pure-data side effects on `wildfires` Map + Health components. The
 * caller passes the chosen tile (derived deterministically from the
 * event PRNG); this keeps the dispatcher unit-testable without
 * needing a full ECS world.
 */
export interface MeteorStrikeInput {
  /** Hex axial position of the meteor impact. */
  q: number;
  /** Hex axial position. */
  r: number;
  /** Entity ids (koota ECS) at the impact tile that should take damage. */
  damagedEntityHealth: Array<{ current: number; max: number }>;
  /** When non-null, the wildfire registry to mutate. */
  wildfires: Map<string, { burnTicksRemaining: number; secondsSinceTick: number }>;
  /** Burn-ticks per WILDFIRE_TUNING.burnTicks. */
  burnTicks: number;
}

export function applyMeteorStrike(input: MeteorStrikeInput): void {
  const { q, r, damagedEntityHealth, wildfires, burnTicks } = input;
  const key = `${q},${r}`;
  // Add to wildfires (overwrites any existing entry — meteor is the
  // dominant ignition). If the tile is non-FOREST the wildfire entry
  // exists but spreads slowly; gameplay surface is the +30 damage.
  wildfires.set(key, { burnTicksRemaining: burnTicks, secondsSinceTick: 0 });
  // Damage every entity at the impact tile by 30 HP (clamp at 0).
  for (const h of damagedEntityHealth) {
    h.current = Math.max(0, h.current - 30);
  }
}

/**
 * M_V7.MYTH.EFFECTS — solar-eclipse: halves vision range for every
 * faction for the eclipse duration (60s per myth-events.json). The
 * runtime caller restores the original radii via `restoreEclipse`
 * when the active event expires; alternative is to scale on each
 * zone-observed pass by reading the active event. v0.7 picks the
 * scale-on-read pattern via the helper below to avoid a restoration
 * race in save/load.
 *
 * Returns the vision multiplier the zone system should apply this
 * tick — 0.5 during an active eclipse, 1.0 otherwise.
 */
export function eclipseVisionMultiplier(state: MythEventsState, nowSeconds: number): number {
  if (!state.active) return 1.0;
  if (state.active.id !== 'solar-eclipse') return 1.0;
  if (nowSeconds >= state.active.expiresAtSeconds) return 1.0;
  return 0.5;
}

/**
 * M_V7.MYTH.EFFECTS — wildlife-migration: returns a candidate tile
 * for the neutral herd spawn. Pure helper — the caller drives the
 * actual ECS spawn via createCharacter / spawnBarbarianCamp (the herd
 * is structurally a barbarian-style neutral aggressor; clearing it
 * yields +20 food, identical to harvest-festival's split per faction).
 *
 * Returns null when no walkable centroid-adjacent tile exists (tiny
 * board edge case).
 */
export function pickMigrationTile(
  walkableTiles: ReadonlyArray<{ q: number; r: number; level: number }>,
  prng: () => number,
): { q: number; r: number; level: number } | null {
  if (walkableTiles.length === 0) return null;
  const idx = Math.floor(prng() * walkableTiles.length);
  return walkableTiles[idx] ?? null;
}

/**
 * M_V7.MYTH.EFFECTS — wildlife-migration: when a herd is cleared, the
 * killing faction receives +20 food. Pure mutation on the supplied
 * GameEconomy ref; callable from the kill-credit path the same way
 * camp-clear-reward fires.
 */
export function applyMigrationReward(eco: GameEconomy): void {
  eco.food = (eco.food ?? 0) + 20;
}

/**
 * M_V7.MYTH.EFFECTS — oracle-vision: pick a random faction (the
 * "blessed" one) and reveal a single tile of another faction's base
 * via the zone system. Pure helper — returns the (revealer,
 * revealed-tile) tuple; the caller writes the reveal into the
 * blessed faction's zone.observed set.
 *
 * Returns null when fewer than 2 player factions exist (no possible
 * cross-faction reveal).
 */
export interface OracleVisionResult {
  blessedFaction: string;
  revealedTileKey: string;
}

export function pickOracleVision(
  playerFactionIds: readonly string[],
  baseKeyOf: (factionId: string) => string | null,
  prng: () => number,
): OracleVisionResult | null {
  if (playerFactionIds.length < 2) return null;
  const blessedIdx = Math.floor(prng() * playerFactionIds.length);
  const blessed = playerFactionIds[blessedIdx];
  if (!blessed) return null;
  // Pick a different faction to reveal.
  const others = playerFactionIds.filter((f) => f !== blessed);
  if (others.length === 0) return null;
  const revealIdx = Math.floor(prng() * others.length);
  const target = others[revealIdx];
  if (!target) return null;
  const tileKey = baseKeyOf(target);
  if (!tileKey) return null;
  return { blessedFaction: blessed, revealedTileKey: tileKey };
}
