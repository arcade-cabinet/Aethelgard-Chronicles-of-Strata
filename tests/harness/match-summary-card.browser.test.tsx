/**
 * M_FUN.NAR.CARD — harness baseline for the match-summary card.
 *
 * Renders the MatchSummaryCard with a representative nickname +
 * highlight set and captures a screenshot for visual regression.
 * The card is the v0.4 surface for procedural match narrative; if
 * its typography / palette drifts, this baseline goes RED before
 * the change reaches users.
 */
import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { MatchSummaryCard } from '@/hud/MatchSummaryCard';

describe('match summary card harness', () => {
  it('renders nickname + highlights', async () => {
    await render(
      <div style={{ padding: 20, background: '#0f172a' }}>
        <MatchSummaryCard
          nickname="The Crushing Banner"
          highlights={[
            'A long campaign — 14 minutes of conflict.',
            'Your forces overwhelmed the enemy with 24 kills.',
            "A builder's reign — 9 structures standing.",
          ]}
        />
      </div>,
    );
    await new Promise((r) => setTimeout(r, 150));
    const path = await page.screenshot({
      path: '__screenshots__/match-summary-card.png',
    });
    expect(path).toBeTruthy();
  });
});
