import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-react';
import { TitleScreen } from '@/hud/TitleScreen';

describe('TitleScreen', () => {
  it('shows the Aethelgard branding', () => {
    render(<TitleScreen onNewGame={() => {}} onSettings={() => {}} />);
    expect(document.getElementById('title-heading')?.textContent).toBe('Aethelgard');
  });

  it('fires onNewGame when New Game is clicked', () => {
    const onNewGame = vi.fn();
    render(<TitleScreen onNewGame={onNewGame} onSettings={() => {}} />);
    (document.getElementById('menu-new-game') as HTMLButtonElement).click();
    expect(onNewGame).toHaveBeenCalledOnce();
  });

  it('disables Continue when no save exists', () => {
    render(<TitleScreen onNewGame={() => {}} onSettings={() => {}} />);
    const cont = document.getElementById('menu-continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(true);
  });

  it('enables Continue when an onContinue handler is given', () => {
    render(<TitleScreen onNewGame={() => {}} onContinue={() => {}} onSettings={() => {}} />);
    const cont = document.getElementById('menu-continue') as HTMLButtonElement;
    expect(cont.disabled).toBe(false);
  });
});
