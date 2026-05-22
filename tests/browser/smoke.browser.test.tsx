import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { App } from '@/App';

describe('browser smoke', () => {
  it('renders the app shell', async () => {
    await render(<App />);
    await expect.element(page.getByText(/Aethelgard/)).toBeInTheDocument();
  });
});
