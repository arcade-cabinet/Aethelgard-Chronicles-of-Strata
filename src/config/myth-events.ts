/**
 * M_V6.MYTH.EVENTS — typed accessor + Zod parse for myth-events.json.
 *
 * Five rare events; shared >5min cooldown between any two firings; at
 * most one active at a time. The runtime carries a `mythEvents` state
 * on GameState that tracks the active event + last-fire clock.
 *
 * Adding a 6th event = one entry in myth-events.json + one switch arm
 * in the dispatcher (M_V6.MYTH.EVENTS work-unit's effect handler).
 */
import { z } from 'zod';
import mythJson from './myth-events.json';

const EventSchema = z.object({
  displayName: z.string().min(1),
  flavorText: z.string().min(1),
  /** Seconds the event's effect persists; 0 = instant. */
  durationSeconds: z.number().min(0),
  /** Selection weight (relative likelihood per fire). */
  weight: z.number().min(0),
});

const FileSchema = z.object({
  minIntervalSeconds: z.number().positive(),
  events: z.record(z.string(), EventSchema),
});

export type MythEventConfig = z.infer<typeof EventSchema>;

function stripComments(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(stripComments);
  if (input && typeof input === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      if (k === '$comment') continue;
      out[k] = stripComments(v);
    }
    return out;
  }
  return input;
}

const _parsed = FileSchema.parse(stripComments(mythJson));

export const MYTH_EVENTS: Record<string, MythEventConfig> = _parsed.events;
/** Shared >5min cooldown between any two myth-event firings. */
export const MYTH_MIN_INTERVAL_SECONDS: number = _parsed.minIntervalSeconds;
export const MYTH_EVENT_IDS: ReadonlyArray<string> = Object.keys(_parsed.events);

/**
 * Lookup an event by id; throws if unknown. Use when the lookup is
 * structurally guaranteed (e.g. iterating MYTH_EVENT_IDS).
 */
export function mythEventFor(id: string): MythEventConfig {
  const e = MYTH_EVENTS[id];
  if (!e) {
    throw new Error(`[myth-events] unknown event id "${id}" — known: ${MYTH_EVENT_IDS.join(', ')}`);
  }
  return e;
}
