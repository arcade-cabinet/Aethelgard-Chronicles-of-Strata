import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { enterGame } from '../e2e/enter-game';

/**
 * M_POLISH2.VISUAL.54 — onboarding tour baselines.
 *
 * Drives through each step of the OnboardingOverlay; baselines
 * are captured at each step. The number of steps may change as
 * the tour content evolves; loop bounded at 12 to avoid an
 * infinite spin if the Next button never disappears.
 */
test('onboarding tour locks each step', async ({ page }, testInfo) => {
  await enterGame(page, 'ancient-silver-forest');
  // The onboarding overlay shows by default on first run; ensure
  // it's visible.
  const next = page.getByRole('button', { name: /Next|Got it|Begin/i });
  await expect(next).toBeVisible({ timeout: 4000 });

  for (let i = 0; i < 12; i++) {
    const slug = `onboarding-step-${i.toString().padStart(2, '0')}`;
    const baseline = join(
      testInfo.titlePath.length > 0 ? `${testInfo.file}-snapshots` : '',
      `${slug}-${testInfo.project.name}-${process.platform}.png`,
    );
    const snapshotName = `${slug}-${testInfo.project.name}.png`;
    if (existsSync(baseline)) {
      await expect(page).toHaveScreenshot(snapshotName, {
        maxDiffPixelRatio: 0.03,
        animations: 'disabled',
      });
    } else {
      await expect(page).toHaveScreenshot(snapshotName, {
        animations: 'disabled',
      });
    }
    // If the Next button is gone (last step finished), break.
    if (!(await next.count())) break;
    if (!(await next.first().isVisible())) break;
    await next.first().click();
    await page.waitForTimeout(300);
  }
});
