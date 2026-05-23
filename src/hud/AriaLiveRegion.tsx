import { useEffect, useState } from 'react';
import { subscribeAnnouncements } from './aria-live-bus';

/**
 * M_AUDIT2.UX.12 — single offscreen aria-live region that pipes
 * announcements from the `aria-live-bus` to assistive tech.
 *
 * Two regions live in parallel — polite + assertive — because a
 * single element flipping between the two confuses some SR
 * implementations. Visually hidden but kept layout-stable so SRs
 * pick the role up.
 *
 * Mount ONCE near the app root; calling `announce(text)` anywhere
 * in the app reaches it via the bus.
 */
export function AriaLiveRegion() {
  const [polite, setPolite] = useState('');
  const [assertive, setAssertive] = useState('');

  useEffect(() => {
    return subscribeAnnouncements((text, politeness) => {
      if (politeness === 'assertive') setAssertive(text);
      else setPolite(text);
    });
  }, []);

  const hidden: React.CSSProperties = {
    position: 'absolute',
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: 0,
  };

  return (
    <>
      <div
        id="aria-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={hidden}
      >
        {polite}
      </div>
      <div
        id="aria-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={hidden}
      >
        {assertive}
      </div>
    </>
  );
}
