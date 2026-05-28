import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { TitleScreen } from '@/hud/overlays';
import { createPersistence } from '@/persistence/persistence';

const persistence = createPersistence();

describe('TitleScreen', () => {
  it('shows the Aethelgard branding', async () => {
    await render(
      <TitleScreen persistence={persistence} onNewGame={() => {}} onSettings={() => {}} />,
    );
    await vi.waitFor(() => {
      expect(document.getElementById('title-heading')?.textContent).toBe('Aethelgard');
    });
  });

  it('fires onNewGame when New Game is clicked', async () => {
    const onNewGame = vi.fn();
    await render(
      <TitleScreen persistence={persistence} onNewGame={onNewGame} onSettings={() => {}} />,
    );
    await vi.waitFor(() => {
      const btn = document.getElementById('menu-new-game');
      if (!btn) throw new Error('not mounted');
    });
    (document.getElementById('menu-new-game') as HTMLButtonElement).click();
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it('disables Continue when no save exists', async () => {
    await render(
      <TitleScreen persistence={persistence} onNewGame={() => {}} onSettings={() => {}} />,
    );
    await vi.waitFor(() => {
      const cont = document.getElementById('menu-continue');
      if (!cont) throw new Error('not mounted');
    });
    const cont = document.getElementById('menu-continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
  });

  it('enables Continue when an onContinue handler is given', async () => {
    await render(
      <TitleScreen
        persistence={persistence}
        onNewGame={() => {}}
        onContinue={() => {}}
        onSettings={() => {}}
      />,
    );
    await vi.waitFor(() => {
      const cont = document.getElementById('menu-continue');
      if (!cont) throw new Error('not mounted');
    });
    const cont = document.getElementById('menu-continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
  });
});
