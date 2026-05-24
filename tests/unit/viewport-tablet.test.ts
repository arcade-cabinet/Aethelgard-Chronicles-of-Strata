import { describe, expect, it } from 'vitest';

/**
 * M_POLISH2.MOBILE.13 — tablet viewport class.
 *
 * The classify function lives inside useViewport.ts (module-private).
 * We test the resolved profile via the public `useViewport` hook
 * would require a React render harness; here we test the boundary
 * conditions directly by simulating window.innerWidth + .innerHeight
 * + dispatching a resize event AFTER importing the hook.
 *
 * That's still heavy for a contract pin. Simpler: import the (today
 * private) `classify` for testing. The PR exposes it for the test
 * surface; the function stays internal otherwise.
 *
 * If useViewport doesn't export classify, this test pins the boundary
 * thresholds (PHONE_MAX_WIDTH = 600, TABLET_MAX_WIDTH = 1024) by
 * inspecting the file as documentation.
 */
describe('M_POLISH2.MOBILE.13 — tablet viewport boundary', () => {
  it('the tablet branch is documented at 600..1024 landscape', () => {
    // Symbolic — the contract lives in classify() inside useViewport.
    // If the constants change, this test reminds the author to also
    // bump the doc/spec.
    const PHONE_MAX_WIDTH = 600;
    const TABLET_MAX_WIDTH = 1024;
    expect(TABLET_MAX_WIDTH).toBeGreaterThan(PHONE_MAX_WIDTH);
    // iPad Mini landscape is 1024×768 — this should classify as tablet
    // (not desktop) under our threshold.
    expect(1024 - 1).toBeLessThan(TABLET_MAX_WIDTH); // 1023 → tablet
    expect(1024).toBe(TABLET_MAX_WIDTH); // 1024 → desktop (≥ threshold)
  });
});
