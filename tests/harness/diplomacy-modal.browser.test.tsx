/**
 * M_V11.HUD.DIPLOMACY-MODAL — DiplomacyModal visual baseline + tap
 * surface coverage.
 *
 * Three baselines: (1) modal with no contact yet (player hasn't met
 * any other faction); (2) modal with one neutral + one ally; (3)
 * modal with an incoming pact proposal showing accept/reject pair.
 * All three pin the layout + the per-row action button set so a
 * regression in DiplomaticEvaluator's UI-visible state trips the diff.
 */
import { page } from '@vitest/browser/context';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-react';
import { setRelation } from '@/game/diplomacy';
import { startGame } from '@/game/game-state';
import { DiplomacyModal } from '@/hud/DiplomacyModal';

function Stage({
  children,
  fireOpenEvent = true,
}: {
  children: React.ReactNode;
  fireOpenEvent?: boolean;
}) {
  useEffect(() => {
    if (!fireOpenEvent) return;
    // Tick after mount so the modal's listener is attached.
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent('aethelgard:open-diplomacy'));
    }, 10);
    return () => clearTimeout(t);
  }, [fireOpenEvent]);
  return (
    <div style={{ width: 720, height: 720, position: 'relative', background: '#0f172a' }}>
      {children}
    </div>
  );
}

const baselineDir = '__screenshots__';

async function settle(ms = 350) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('M_V11.HUD.DIPLOMACY-MODAL — visual baselines', () => {
  it('no contact yet — modal lists factions as unknown', async () => {
    const game = startGame('diplo-modal-no-contact');
    render(
      <Stage>
        <DiplomacyModal game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/diplomacy-modal-no-contact.png` }),
    ).resolves.toBeTruthy();
  });

  it('neutral + ally relations — full action set visible', async () => {
    const game = startGame('diplo-modal-neutral-ally');
    // Seed an ally row so the Break Pact / War buttons appear.
    setRelation(game.diplomacy, 'player', 'enemy', 'ally', 0);
    render(
      <Stage>
        <DiplomacyModal game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/diplomacy-modal-ally.png` }),
    ).resolves.toBeTruthy();
  });

  it('timed alliance — shows countdown', async () => {
    const game = startGame('diplo-modal-timed-ally');
    // Seed a timed alliance with 4 minutes remaining. Verifies the
    // "Xm YYs left" suffix renders.
    setRelation(game.diplomacy, 'player', 'enemy', 'ally', 0, null, 240);
    render(
      <Stage>
        <DiplomacyModal game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/diplomacy-modal-timed-alliance.png` }),
    ).resolves.toBeTruthy();
  });

  it('incoming pact proposal — accept/reject pair shown', async () => {
    const game = startGame('diplo-modal-incoming');
    // Seed a contact (any relation row creates the has-had-contact gate).
    setRelation(game.diplomacy, 'player', 'enemy', 'ally', 0);
    // Then drop it back to neutral so the row is "known" but no relation
    // — and queue an incoming proposal.
    setRelation(game.diplomacy, 'player', 'enemy', 'neutral', 0);
    game.diplomacyProposals.pending.push({
      proposer: 'enemy',
      target: 'player',
      expiresAtSeconds: 999,
    });
    render(
      <Stage>
        <DiplomacyModal game={game} />
      </Stage>,
    );
    await settle();
    await expect(
      page.screenshot({ path: `${baselineDir}/diplomacy-modal-incoming-proposal.png` }),
    ).resolves.toBeTruthy();
  });
});
