/**
 * M_V13.HUD.TOKEN-SCALE — pins the HUD token ramps + safe-area helpers
 * so a future edit can't silently break the spacing/z/tap contracts the
 * §B HUD-layout fixes build on.
 */
import { describe, expect, it } from 'vitest';
import { HUD_THEME, safeBottom, safeLeft, safeRight, safeTop } from '../hud-theme';

describe('HUD token scale', () => {
  it('space ramp is a monotonically increasing 4-based scale', () => {
    const { xs, sm, md, lg, xl } = HUD_THEME.space;
    expect([xs, sm, md, lg, xl]).toEqual([4, 8, 12, 16, 24]);
    // strictly ascending so a `space.lg` is always > `space.md` etc.
    const vals = [xs, sm, md, lg, xl];
    for (let i = 1; i < vals.length; i++) {
      expect(vals[i]).toBeGreaterThan(vals[i - 1] as number);
    }
  });

  it('z ladder orders board < pills < panels < banners < menu < modal < toast', () => {
    const z = HUD_THEME.z;
    const order = [z.board, z.pills, z.panels, z.banners, z.menu, z.modal, z.toast];
    for (let i = 1; i < order.length; i++) {
      expect(order[i]).toBeGreaterThan(order[i - 1] as number);
    }
    // toast is the top of the stack — notifications must never be occluded.
    expect(z.toast).toBe(Math.max(...order));
  });

  it('tapTarget meets the 48dp Material / WCAG 2.5.5 floor', () => {
    expect(HUD_THEME.tapTarget).toBeGreaterThanOrEqual(48);
  });

  it('safe-area helpers wrap env() with a non-zero default px gap', () => {
    // default gap is space.md so desktop (env→0) still keeps a margin.
    expect(safeTop()).toBe('calc(env(safe-area-inset-top, 0px) + 12px)');
    expect(safeBottom()).toBe('calc(env(safe-area-inset-bottom, 0px) + 12px)');
    expect(safeLeft()).toBe('calc(env(safe-area-inset-left, 0px) + 12px)');
    expect(safeRight()).toBe('calc(env(safe-area-inset-right, 0px) + 12px)');
  });

  it('safe-area helpers stack an explicit extra px on top of the inset', () => {
    expect(safeTop(64)).toBe('calc(env(safe-area-inset-top, 0px) + 64px)');
    expect(safeBottom(0)).toBe('calc(env(safe-area-inset-bottom, 0px) + 0px)');
  });
});
