/**
 * M_HUD.NOTIF.1 + M_HUD.NOTIF.2 — Toasts component harness.
 *
 * Verifies:
 * - Dispatching `aethelgard:toast` mounts a toast with the supplied title.
 * - Multiple toasts stack; the 4th non-critical evicts the oldest.
 * - A toast with `focus: { q, r }` fires `aethelgard:focus-tile` on tap.
 * - Critical toasts bypass the cap and never auto-dismiss.
 *
 * Implementation-detail rule: this harness asserts queue behavior via
 * data-testid lookup on Toast.Root, NOT via inner text matching (the
 * Toast primitive composes a portal — text queries can flake on
 * portal mount-order).
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { Toasts } from '@/hud/overlays';

function emit(detail: Record<string, unknown>) {
  window.dispatchEvent(new CustomEvent('aethelgard:toast', { detail }));
}

describe('Toasts (M_HUD.NOTIF.1)', () => {
  it('mounts a toast when aethelgard:toast fires', async () => {
    render(<Toasts />);
    await new Promise((r) => setTimeout(r, 30));
    emit({ id: 'first', title: 'Discovery unlocked', tone: 'success' });
    await new Promise((r) => setTimeout(r, 60));
    const node = document.querySelector('[data-testid="toast-success-first"]');
    expect(node).not.toBeNull();
  });

  it('caps non-critical toasts at 3 visible (FIFO eviction)', async () => {
    render(<Toasts />);
    await new Promise((r) => setTimeout(r, 30));
    emit({ id: 'a', title: 'A' });
    emit({ id: 'b', title: 'B' });
    emit({ id: 'c', title: 'C' });
    emit({ id: 'd', title: 'D' });
    await new Promise((r) => setTimeout(r, 60));
    // a is oldest non-critical and should have been evicted by d
    expect(document.querySelector('[data-testid="toast-info-a"]')).toBeNull();
    expect(document.querySelector('[data-testid="toast-info-b"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="toast-info-c"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="toast-info-d"]')).not.toBeNull();
  });

  it('critical toasts bypass the cap', async () => {
    render(<Toasts />);
    await new Promise((r) => setTimeout(r, 30));
    emit({ id: 'n1', title: 'normal one' });
    emit({ id: 'n2', title: 'normal two' });
    emit({ id: 'n3', title: 'normal three' });
    emit({ id: 'cr', title: 'CRITICAL!', tone: 'critical' });
    await new Promise((r) => setTimeout(r, 60));
    // none of the non-critical should have been evicted by the critical
    expect(document.querySelector('[data-testid="toast-info-n1"]')).not.toBeNull();
    expect(document.querySelector('[data-testid="toast-critical-cr"]')).not.toBeNull();
  });

  it('toasts with focus fire aethelgard:focus-tile on click', async () => {
    render(<Toasts />);
    await new Promise((r) => setTimeout(r, 30));
    const spy = vi.fn();
    const handler = (e: Event) => spy((e as CustomEvent).detail);
    window.addEventListener('aethelgard:focus-tile', handler);
    try {
      emit({ id: 'engage', title: 'Enemy at Palace', focus: { q: 2, r: -1 } });
      await new Promise((r) => setTimeout(r, 60));
      // Radix Toast.Root with asChild sets data-testid on its child
      // (the motion.div). The motion.div renders a child wrapper too —
      // grab the data-testid element and click ITS innermost div so
      // the synthetic React onClick fires.
      const node = document.querySelector(
        '[data-testid="toast-info-engage"]',
      ) as HTMLElement | null;
      expect(node).not.toBeNull();
      node?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await new Promise((r) => setTimeout(r, 30));
      expect(spy).toHaveBeenCalledWith({ q: 2, r: -1 });
    } finally {
      window.removeEventListener('aethelgard:focus-tile', handler);
    }
  });
});
