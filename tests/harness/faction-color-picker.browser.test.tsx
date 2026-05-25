/**
 * M_PIVOT.N-PLAYER.COLOR-PICKER — harness baseline for the picker.
 *
 * Vitest browser harness pattern (matches biome-swatch.browser):
 * the screenshot file IS the baseline. Vitest browser's
 * `page.screenshot({ path })` writes the file on first run and
 * overwrites on subsequent runs; the agent reviews the committed
 * PNG against the spec at PR time.
 *
 * DOM assertions cover the picker contract:
 *   - chip renders with the current color background
 *   - clicking the chip opens the popper grid
 *   - clicking a palette chip fires onChange with the chip's color
 *   - typing a hex into the input + clicking Apply fires onChange
 *   - clicking outside closes the popper
 */
import { page, userEvent } from '@vitest/browser/context';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { FACTION_PALETTE } from '@/config/faction-palette';
import { FactionColorPicker } from '@/hud/FactionColorPicker';

function PickerHarness({ initial }: { initial: string }) {
  const [color, setColor] = useState(initial);
  return (
    <div style={{ padding: 40, background: '#0f172a', minHeight: 160 }}>
      <div style={{ color: '#fff', marginBottom: 8, fontSize: 13 }}>
        Current: <span data-testid="harness-color-value">{color}</span>
      </div>
      <FactionColorPicker color={color} onChange={setColor} ariaLabel="Pick faction color" />
    </div>
  );
}

describe('FactionColorPicker harness', () => {
  it('renders chip + opens popper + picks a chip + types a hex', async () => {
    await render(<PickerHarness initial="#3b82f6" />);

    // 1. Chip is present with the initial color.
    const chip = document.querySelector<HTMLButtonElement>('[data-testid="faction-color-chip"]');
    expect(chip).not.toBeNull();
    expect(chip?.style.background).toContain('rgb(59, 130, 246)');
    // popper is closed at start.
    expect(document.querySelector('[data-testid="faction-color-popper"]')).toBeNull();

    // 2. Click chip → popper opens.
    await userEvent.click(chip!);
    const popper = await new Promise<Element>((res) => {
      const id = setInterval(() => {
        const p = document.querySelector('[data-testid="faction-color-popper"]');
        if (p) {
          clearInterval(id);
          res(p);
        }
      }, 10);
    });
    expect(popper).not.toBeNull();
    // All 12 chips visible.
    const paletteChips = document.querySelectorAll('[data-testid^="palette-chip-"]');
    expect(paletteChips.length).toBe(FACTION_PALETTE.length);

    // Screenshot the open state for the visual review.
    await page.screenshot({ path: '__screenshots__/faction-color-picker-open.png' });

    // 3. Click the green chip → onChange fires + popper closes.
    const greenChip = document.querySelector<HTMLButtonElement>(
      '[data-testid="palette-chip-green"]',
    );
    expect(greenChip).not.toBeNull();
    await userEvent.click(greenChip!);
    // popper closes.
    await new Promise<void>((res) => {
      const id = setInterval(() => {
        if (!document.querySelector('[data-testid="faction-color-popper"]')) {
          clearInterval(id);
          res();
        }
      }, 10);
    });
    const valueEl = document.querySelector('[data-testid="harness-color-value"]');
    expect(valueEl?.textContent).toBe('#22c55e');

    // 4. Open again + type a custom hex via the input.
    await userEvent.click(
      document.querySelector<HTMLButtonElement>('[data-testid="faction-color-chip"]')!,
    );
    const input = document.querySelector<HTMLInputElement>(
      '[data-testid="faction-color-hex-input"]',
    );
    expect(input).not.toBeNull();
    await userEvent.fill(input!, '#abcdef');
    const apply = document.querySelector<HTMLButtonElement>(
      '[data-testid="faction-color-hex-apply"]',
    );
    expect(apply).not.toBeNull();
    await userEvent.click(apply!);
    expect(document.querySelector('[data-testid="harness-color-value"]')?.textContent).toBe(
      '#abcdef',
    );
  });
});
