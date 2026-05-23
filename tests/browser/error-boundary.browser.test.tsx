/**
 * ErrorBoundary regression (M_AUDIT2.ARCH.50) — real DOM via the
 * Vitest browser harness (no @testing-library/react in the dep set).
 *
 * Pins: child throws → fallback renders; child OK → child renders.
 */
import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { ErrorBoundary } from '@/render/ErrorBoundary';

function Boom(): null {
  throw new Error('boom');
}

describe('ErrorBoundary (M_AUDIT2.ARCH.50)', () => {
  it('renders children when nothing throws', async () => {
    const screen = await render(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <span>ok</span>
      </ErrorBoundary>,
    );
    await expect.element(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders fallback when a descendant throws', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const screen = await render(
      <ErrorBoundary fallback={<span>fallback</span>}>
        <Boom />
      </ErrorBoundary>,
    );
    await expect.element(screen.getByText('fallback')).toBeInTheDocument();
    consoleError.mockRestore();
  });
});
