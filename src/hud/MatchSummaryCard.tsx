/**
 * M_FUN.NAR.CARD — extracted, isolated post-match summary card.
 *
 * GameOverModal renders this in-place (nickname + highlight list)
 * when a match ends. Lifting it out keeps the harness test rig
 * small AND lets the future "match history" / save-list UI re-use
 * the same visual treatment.
 *
 * Inputs are PRE-COMPUTED strings — the card has no business logic.
 * Use `matchNickname()` + `matchHighlights()` from
 * `src/game/match-narrative` to derive them from a live game.
 */
import { HUD_THEME } from './theme';

export interface MatchSummaryCardProps {
  /** Procedural match nickname (e.g. "The Crushing Banner"). */
  nickname: string;
  /** 1-3 highlight sentences for the body of the card. */
  highlights: string[];
}

export function MatchSummaryCard({ nickname, highlights }: MatchSummaryCardProps) {
  return (
    <div
      data-testid="match-summary-card"
      style={{
        fontFamily: HUD_THEME.font.body,
        background: 'rgba(9,13,22,0.97)',
        border: `1px solid ${HUD_THEME.color.border}`,
        borderRadius: 16,
        padding: '18px 22px',
        maxWidth: 380,
      }}
    >
      <div
        data-testid="match-summary-nickname"
        style={{
          color: HUD_THEME.color.accent,
          fontFamily: HUD_THEME.font.display,
          fontSize: '1rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        {nickname}
      </div>
      <ul
        data-testid="match-summary-highlights"
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          color: HUD_THEME.color.text,
          fontSize: '0.9rem',
        }}
      >
        {highlights.map((line) => (
          <li key={line} style={{ padding: '4px 0' }}>
            • {line}
          </li>
        ))}
      </ul>
    </div>
  );
}
