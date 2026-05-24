/**
 * M_AUDIT2.UX.12 — accessibility announcement bus.
 *
 * A flat pub/sub for messages that should be read by a screen
 * reader via an aria-live region. Game events (raid, weather change,
 * research complete, unit ready) call `announce(text)`; the single
 * `AriaLiveRegion` component subscribes once and re-renders with the
 * latest message. Messages are coalesced into a 250ms window so
 * back-to-back combat outcomes don't spam SR users.
 *
 * Politeness:
 * - 'polite' (default) waits for the SR to finish current speech.
 * - 'assertive' interrupts (used by CriticalWarning).
 */
export type Politeness = 'polite' | 'assertive';

type Subscriber = (text: string, politeness: Politeness) => void;

const subscribers = new Set<Subscriber>();
let coalesceTimer: number | null = null;
let pendingPolite: string[] = [];
let pendingAssertive: string[] = [];

/**
 * M_EXPANSION.D.175 — coalesce window in ms. Bus exports a setter
 * so a future a11y test or a slow-SR profile can tune the latency
 * without recompiling the bus. Default 250ms is the announce-spec
 * sweet spot (long enough to dedupe combat flurries; short enough
 * for an alarm to read as immediate).
 */
let coalesceMs = 250;
export function setAriaLiveCoalesceMs(ms: number): void {
  coalesceMs = Math.max(0, Math.min(2000, Math.floor(ms)));
}
export function getAriaLiveCoalesceMs(): number {
  return coalesceMs;
}

function flush() {
  coalesceTimer = null;
  if (pendingAssertive.length > 0) {
    const text = pendingAssertive.join('. ');
    pendingAssertive = [];
    for (const s of subscribers) s(text, 'assertive');
  }
  if (pendingPolite.length > 0) {
    const text = pendingPolite.join('. ');
    pendingPolite = [];
    for (const s of subscribers) s(text, 'polite');
  }
}

export function announce(text: string, politeness: Politeness = 'polite'): void {
  if (!text) return;
  if (politeness === 'assertive') pendingAssertive.push(text);
  else pendingPolite.push(text);
  if (coalesceTimer !== null) return;
  if (typeof window === 'undefined') {
    flush();
    return;
  }
  coalesceTimer = window.setTimeout(flush, coalesceMs);
}

export function subscribeAnnouncements(cb: Subscriber): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Test hook — drain pending + clear subscribers. */
export function _resetAriaLiveBusForTests(): void {
  if (coalesceTimer !== null) {
    if (typeof window !== 'undefined') window.clearTimeout(coalesceTimer);
    coalesceTimer = null;
  }
  pendingPolite = [];
  pendingAssertive = [];
  subscribers.clear();
}
