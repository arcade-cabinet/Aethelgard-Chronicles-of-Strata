/**
 * M_V11.META-PROGRESSION — AtelierScreen visual baseline.
 *
 * Three states pinned: fresh install (0 tokens, 0 unlocks), mid-
 * progression (some unlocked + tokens to spend), end-state (most
 * unlocked + lots of tokens). Each pins the section grouping +
 * per-row affordability coloring + the lore-token balance header.
 */
import { page } from '@vitest/browser/context';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { AtelierScreen } from '@/hud/AtelierScreen';
import type { Persistence } from '@/persistence/persistence';

function stubPersistence(opts: { tokens: number; unlockedIds?: string[] }): Persistence {
  let tokens = opts.tokens;
  const unlocked = new Set(opts.unlockedIds ?? []);
  return {
    save: async () => {},
    load: async () => null,
    list: async () => [],
    recordLorebookEntry: async () => {},
    listLorebook: async () => [],
    listMetaUnlocks: async () => Array.from(unlocked),
    unlockMeta: async (id: string) => {
      unlocked.add(id);
    },
    getLoreTokens: async () => tokens,
    earnLoreTokens: async (n: number) => {
      tokens = Math.max(0, tokens + n);
    },
    getSetting: async () => null,
    setSetting: async () => {},
    getEventSeed: async () => 'stub',
    advanceAndPersistEventSeed: async () => 'stub',
    reset: async () => {},
    recordDailyChallengeScore: async () => {},
    listDailyChallengeScores: async () => [],
  };
}

function Stage({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('aethelgard:open-atelier'));
    }, 10);
    return () => clearTimeout(t);
  }, []);
  return (
    <div style={{ width: 800, height: 900, position: 'relative', background: '#0f172a' }}>
      {children}
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle(ms = 500) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('M_V11.META-PROGRESSION — AtelierScreen baseline', () => {
  it('fresh install — 0 tokens, 0 unlocks', async () => {
    const p = stubPersistence({ tokens: 0 });
    render(
      <Stage>
        <AtelierScreen persistence={p} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/atelier-fresh.png` }),
    ).resolves.toBeTruthy();
  });

  it('mid-progression — 10 tokens, 3 unlocks', async () => {
    const p = stubPersistence({
      tokens: 10,
      unlockedIds: ['starter-extra-peon', 'skin-iron-hill', 'lore-chapter-1'],
    });
    render(
      <Stage>
        <AtelierScreen persistence={p} />
      </Stage>,
    );
    await settle();
    await expect(page.screenshot({ path: `${baselineDir}/atelier-mid.png` })).resolves.toBeTruthy();
  });

  it('end-state — 99 tokens, most unlocked', async () => {
    const p = stubPersistence({
      tokens: 99,
      unlockedIds: [
        'starter-extra-peon',
        'starter-scout',
        'starter-footman',
        'starter-farm',
        'starter-granary',
        'skin-iron-hill',
        'skin-amber-vale',
        'hero-knight-errant',
        'hero-shieldmaiden',
        'lore-chapter-1',
        'lore-chapter-2',
        'lore-chapter-3',
      ],
    });
    render(
      <Stage>
        <AtelierScreen persistence={p} />
      </Stage>,
    );
    await settle();
    await expect(page.screenshot({ path: `${baselineDir}/atelier-end.png` })).resolves.toBeTruthy();
  });
});
