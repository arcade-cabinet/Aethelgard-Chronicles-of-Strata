/**
 * M_FUN.NAR.CARD — harness baseline for the match-summary card.
 *
 * Vitest browser harness pattern (matches biome-swatch.browser):
 * the screenshot file IS the baseline. Vitest browser's
 * `page.screenshot({ path })` writes the file on first run and
 * overwrites on subsequent runs; the agent reviews the committed
 * PNG against the spec / design reference at PR time.
 *
 * Runtime visual REGRESSION (toHaveScreenshot pixel-diff) lives in
 * the Playwright `tests/visual/` suite — those run on demand
 * (pnpm test:e2e:visual). This harness test exists for fast
 * per-feature isolation: render the card, capture, eyeball the
 * PNG, lock it. If the rendered DOM is malformed, the assertions
 * below catch it before the screenshot is even taken.
 *
 * Reviewer-fix (MED #6): add real DOM assertions so the test fails
 * if the card structure breaks — not just if the screenshot call
 * itself fails. The committed PNG remains the visual lock-in
 * artifact.
 */
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MatchSummaryCard } from '@/hud/MatchSummaryCard';

describe('match summary card harness', () => {
  it('renders nickname + highlights', async () => {
    const highlights = [
      'A long campaign — 14 minutes of conflict.',
      'Your forces overwhelmed the enemy with 24 kills.',
      "A builder's reign — 9 structures standing.",
    ];
    await render(
      <div style={{ padding: 20, background: '#0f172a' }}>
        <MatchSummaryCard nickname="The Crushing Banner" highlights={highlights} />
      </div>,
    );
    await new Promise((r) => setTimeout(r, 150));

    // DOM assertions — these are the real regression fence. If the
    // card's structure drifts, this fails before the screenshot is
    // captured. The screenshot path is the eyeball-review artifact.
    const card = document.querySelector('[data-testid="match-summary-card"]');
    expect(card).not.toBeNull();
    const nickEl = document.querySelector('[data-testid="match-summary-nickname"]');
    expect(nickEl?.textContent).toBe('The Crushing Banner');
    const bullets = document.querySelectorAll('[data-testid="match-summary-highlights"] li');
    expect(bullets.length).toBe(highlights.length);
    bullets.forEach((li, i) => {
      const expected = highlights[i];
      if (expected) expect(li.textContent).toContain(expected);
    });

    const path = await page.screenshot({
      path: '__screenshots__/match-summary-card.png',
    });
    expect(path).toBeTruthy();
  });
});
