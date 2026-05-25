/**
 * M_FUN.REFACTOR.NEWGAMEMODAL-SPLIT — Opponent controls: AI-vs-AI toggle +
 * named personality card grid. Extracted from NewGameModal.tsx.
 */
import { ALL_PERSONALITIES, personalityFor } from '@/config/ai-personalities';
import { Segmented } from './Segmented';
import { HUD_THEME } from './hud-theme';

export interface OpponentPickerProps {
  aiVsAi: boolean;
  setAiVsAi: (v: boolean) => void;
  enemyPersonality: string;
  setEnemyPersonality: (key: string) => void;
}

/**
 * M_POLISH3.AIVAI.1 + M_FUN.AI.PICKER — AI-vs-AI mode toggle and named
 * opponent personality picker. Hovering a personality card reveals the
 * documented flaw so the player can learn matchup counter-strategies
 * over time.
 */
export function OpponentPicker({
  aiVsAi,
  setAiVsAi,
  enemyPersonality,
  setEnemyPersonality,
}: OpponentPickerProps) {
  return (
    <>
      {/*
        M_POLISH3.AIVAI.1 — AI-vs-AI toggle. Both factions run a
        yuka AiPlayer; no human input required. Used by e2e
        playthrough capture + by anyone who wants to spectate.
      */}
      <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Player input</p>
      <div style={{ margin: '6px 0 18px' }}>
        <Segmented
          value={aiVsAi ? 'ai-vs-ai' : 'human'}
          options={['human', 'ai-vs-ai'] as const}
          labels={{ human: 'Human vs AI', 'ai-vs-ai': 'AI vs AI (spectate)' }}
          onChange={(v) => setAiVsAi(v === 'ai-vs-ai')}
        />
      </div>

      {/*
        M_FUN.AI.PICKER — named opponent picker. 5 personalities
        from src/config/ai-personalities.json. Hovering a card
        reveals the documented flaw (the player learns the
        matchup over time).
      */}
      <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Opponent</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 8,
          margin: '6px 0 18px',
        }}
      >
        {ALL_PERSONALITIES.map((key) => {
          const p = personalityFor(key);
          const selected = enemyPersonality === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setEnemyPersonality(key)}
              title={`${p.description}\n\nFlaw: ${p.flaw}`}
              style={{
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${selected ? HUD_THEME.color.accent : HUD_THEME.color.border}`,
                background: selected ? HUD_THEME.color.panel : 'transparent',
                color: selected ? HUD_THEME.color.text : HUD_THEME.color.muted,
                fontSize: '0.78rem',
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              <div style={{ fontWeight: 700 }}>{p.displayName}</div>
              <div style={{ fontSize: '0.66rem', opacity: 0.8, marginTop: 4 }}>
                {p.description.split('.')[0]}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
