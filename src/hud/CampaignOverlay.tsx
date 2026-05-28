/**
 * M_V11.CAMPAIGN (#77g) — chapter overlay.
 *
 * Mirrors TutorialOverlay's structure but reads the objective queue
 * from CAMPAIGN_CHAPTERS keyed by `game.campaignChapter`. Polls the
 * game state every 250ms; advances when the active objective's
 * check returns true; shows "Chapter complete" + a "Pick next
 * chapter" button (dispatches the open-new-game event) at the end.
 *
 * Renders only when game.mode === 'campaign'.
 *
 * The chapter id lives on GameState.campaignChapter (a TypeScript-
 * narrowed string union). Today's default is 'first-strata'; a
 * chapter-picker UI on the NewGameModal lets the player pick which
 * chapter to start (later commit; this overlay handles all three).
 */
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import { type ChapterId, chapterFor, CHAPTER_IDS } from '@/config/campaign-chapters';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './theme';

export interface CampaignOverlayProps {
  game: GameState;
}

const POLL_INTERVAL_MS = 250;

export function CampaignOverlay({ game }: CampaignOverlayProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [, setTick] = useState(0);

  // Read the chapter id from the game state. Falls back to chapter
  // 1 if unset (the default `campaignChapter` initializer).
  const chapterId: ChapterId =
    (game as GameState & { campaignChapter?: ChapterId }).campaignChapter ?? 'first-strata';
  const chapter = chapterFor(chapterId);

  useEffect(() => {
    if (game.mode !== 'campaign') return;
    const interval = setInterval(() => {
      const active = chapter.objectives[stepIndex];
      if (active?.check(game)) {
        setStepIndex((i) => Math.min(i + 1, chapter.objectives.length));
      } else {
        setTick((t) => t + 1);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [game, stepIndex, chapter]);

  if (game.mode !== 'campaign') return null;

  const isComplete = stepIndex >= chapter.objectives.length;
  const step = isComplete ? null : chapter.objectives[stepIndex];
  const chapterIndex = CHAPTER_IDS.indexOf(chapterId) + 1;

  const overlayStyle: CSSProperties = {
    position: 'fixed',
    bottom: 'calc(var(--safe-bottom) + 80px)',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(460px, 92vw)',
    background: HUD_THEME.color.panel,
    border: `2px solid ${HUD_THEME.color.gold ?? '#e4b54b'}`,
    borderRadius: 10,
    padding: '14px 18px',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.5)',
    zIndex: 200,
    fontFamily: HUD_THEME.font.body,
  };

  return (
    <aside id="campaign-overlay" aria-label={`${chapter.title} overlay`} style={overlayStyle}>
      <div
        style={{
          color: HUD_THEME.color.gold ?? '#e4b54b',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 1,
          marginBottom: 4,
        }}
      >
        {chapter.title}
      </div>
      {isComplete ? (
        <>
          <div
            style={{
              color: HUD_THEME.color.gold ?? '#e4b54b',
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            ✓ Chapter {chapterIndex} complete
          </div>
          <p style={{ margin: '0 0 12px', color: HUD_THEME.color.text, fontSize: 13 }}>
            {chapterIndex < CHAPTER_IDS.length
              ? `Open the menu to start Chapter ${chapterIndex + 1}, or play a skirmish to test what you've learned.`
              : `You've completed every chapter. Open the menu to start a skirmish — the realm of Aethelgard is yours.`}
          </p>
          <button
            type="button"
            id="campaign-finish-new-game"
            aria-label="Open new game modal"
            onClick={() => window.dispatchEvent(new CustomEvent('aethelgard:open-new-game'))}
            style={{
              padding: '8px 16px',
              background: HUD_THEME.color.accent,
              color: HUD_THEME.color.panel,
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Pick next match
          </button>
        </>
      ) : step ? (
        <>
          <div
            style={{
              color: HUD_THEME.color.muted,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 4,
            }}
          >
            Objective {stepIndex + 1} / {chapter.objectives.length}
          </div>
          <div
            id={`campaign-step-title-${step.id}`}
            style={{
              color: HUD_THEME.color.text,
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 6,
            }}
          >
            {step.title}
          </div>
          <p
            id={`campaign-step-body-${step.id}`}
            style={{ margin: 0, color: HUD_THEME.color.muted, fontSize: 13, lineHeight: 1.4 }}
          >
            {step.body}
          </p>
        </>
      ) : null}
    </aside>
  );
}
