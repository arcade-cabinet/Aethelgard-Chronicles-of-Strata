/**
 * M_FUN.REFACTOR.NEWGAMEMODAL-SPLIT — Seed phrase input + randomize + share
 * buttons, extracted from NewGameModal.tsx.
 */
import type { MutableRefObject } from 'react';
import { randomSeedPhrase } from '@/core/seed-phrase';
import { HUD_THEME } from './hud-theme';

export interface SeedFieldProps {
  seedPhrase: string;
  setSeedPhrase: (phrase: string) => void;
  eventRng: MutableRefObject<() => number>;
}

/** Seed phrase label + text input + randomize + clipboard-copy buttons. */
export function SeedField({ seedPhrase, setSeedPhrase, eventRng }: SeedFieldProps) {
  return (
    <>
      <label htmlFor="seed-input" style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted }}>
        Seed phrase
      </label>
      <div style={{ display: 'flex', gap: 8, margin: '6px 0 18px' }}>
        <input
          id="seed-input"
          value={seedPhrase}
          // M_AUDIT2.UX.16 — autoFocus the seed input so the modal
          // opens with the cursor where the player will start typing.
          // biome-ignore lint/a11y/noAutofocus: modal-open autofocus is the expected UX.
          autoFocus
          // M_SEC.8 — seed input cap + sanitise: 64 chars max, letters
          // and digits and hyphens and spaces, NFC-normalise (rejects
          // RTL overrides / zero-width joiners), autoComplete off so
          // browser autofill doesn't dump arbitrary text.
          // M_EXPANSION.F.82 — digits 0-9 now allowed so a player can
          // paste a 64-char hex seed directly (bypassing the adj-adj-
          // noun mnemonic). seedrandom accepts either shape.
          maxLength={64}
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          onChange={(e) => {
            const cleaned = e.target.value
              .normalize('NFC')
              .replace(/[^a-z0-9\- ]/gi, '')
              .slice(0, 64);
            setSeedPhrase(cleaned);
          }}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 8,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(0,0,0,0.4)',
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            fontSize: '0.9rem',
          }}
        />
        <button
          type="button"
          id="randomize-seed"
          aria-label="Randomize seed"
          onClick={() => setSeedPhrase(randomSeedPhrase(eventRng.current))}
          style={{
            padding: '0 12px',
            borderRadius: 8,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(56,189,248,0.12)',
            color: HUD_THEME.color.accent,
            fontSize: '1.05rem',
            cursor: 'pointer',
          }}
        >
          🎲
        </button>
        {/* M_EXPANSION.F.73 — copy current seed to clipboard so
            players can share an exact map between sessions. Falls
            back to a console-log if the Clipboard API is unavailable
            (older browsers / file:// origin). */}
        <button
          type="button"
          id="share-seed"
          aria-label="Copy seed to clipboard"
          onClick={() => {
            const text = seedPhrase.trim();
            if (!text) return;
            if (typeof navigator !== 'undefined' && navigator.clipboard) {
              void navigator.clipboard.writeText(text);
            } else {
              console.log('[share-seed] clipboard unavailable; seed:', text);
            }
          }}
          style={{
            padding: '0 12px',
            borderRadius: 8,
            border: `1px solid ${HUD_THEME.color.border}`,
            background: 'rgba(56,189,248,0.12)',
            color: HUD_THEME.color.accent,
            fontSize: '1.05rem',
            cursor: 'pointer',
          }}
        >
          📋
        </button>
      </div>
    </>
  );
}
