import axe, { type AxeResults, type Result as AxeViolation } from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { startGame } from '@/game/game-state';
import { GameOverModal } from '@/hud/GameOverModal';
import { NewGameModal } from '@/hud/NewGameModal';

/**
 * M_EXPANSION.T.138 — axe-core accessibility scan of every modal.
 *
 * The scan runs the WCAG 2.1 AA + best-practice rules against the rendered
 * DOM of each modal. We assert ZERO violations in the rules we ship for —
 * decorative-only canvas + r3f content (which axe cannot meaningfully
 * inspect) is excluded by scoping the scan to the modal's own subtree.
 *
 * If axe reports a violation, the test prints the rule id, severity,
 * and selector so the fix is obvious from the failure output.
 */
function formatViolations(violations: AxeViolation[]): string {
  return violations
    .map((v) => {
      const targets = v.nodes
        .map((n) => n.target.join(' > '))
        .slice(0, 3)
        .join(' | ');
      return `[${v.impact}] ${v.id}: ${v.help} (${targets})`;
    })
    .join('\n');
}

async function scan(container: Element): Promise<AxeResults> {
  // colour-contrast requires a paint pass that the headless test runner
  // sometimes hasn't completed; we exclude it from the gate (the design
  // tokens are tested separately at the palette layer).
  return axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'best-practice'],
    },
    rules: {
      'color-contrast': { enabled: false },
      // Radix portals + Three.js canvas can sit outside <main>; the
      // landmark rules false-positive on test fixtures.
      region: { enabled: false },
    },
  });
}

describe('M_EXPANSION.T.138 — axe-core a11y scan of modals', () => {
  it('GameOverModal (win) has zero axe violations', async () => {
    const game = startGame('axe-win');
    game.outcome = 'win';
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('game-over-modal')) throw new Error('modal not open');
      },
      { timeout: 4000, interval: 100 },
    );
    const modal = document.getElementById('game-over-modal');
    if (!modal) throw new Error('modal not open');
    const results = await scan(modal);
    if (results.violations.length > 0) {
      throw new Error(`axe violations:\n${formatViolations(results.violations)}`);
    }
    expect(results.violations.length).toBe(0);
  });

  it('GameOverModal (loss) has zero axe violations', async () => {
    const game = startGame('axe-loss');
    game.outcome = 'loss';
    await render(<GameOverModal game={game} />);
    await vi.waitFor(
      () => {
        if (!document.getElementById('game-over-modal')) throw new Error('modal not open');
      },
      { timeout: 4000, interval: 100 },
    );
    const modal = document.getElementById('game-over-modal');
    if (!modal) throw new Error('modal not open');
    const results = await scan(modal);
    if (results.violations.length > 0) {
      throw new Error(`axe violations:\n${formatViolations(results.violations)}`);
    }
    expect(results.violations.length).toBe(0);
  });

  it('NewGameModal has zero axe violations', async () => {
    await render(<NewGameModal open={true} onOpenChange={() => {}} onBegin={() => {}} />);
    await vi.waitFor(
      () => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) throw new Error('NewGameModal not open');
      },
      { timeout: 4000, interval: 100 },
    );
    const dialog = document.querySelector('[role="dialog"]');
    if (!dialog) throw new Error('NewGameModal not open');
    const results = await scan(dialog);
    if (results.violations.length > 0) {
      throw new Error(`axe violations:\n${formatViolations(results.violations)}`);
    }
    expect(results.violations.length).toBe(0);
  });
});
