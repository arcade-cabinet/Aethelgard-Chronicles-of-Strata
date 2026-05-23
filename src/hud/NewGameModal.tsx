import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { availableMapSizes, DEFAULT_MAP_SIZE, MAP_SIZES, type MapSizeKey } from '@/core/map-size';
import { createEventPrng, createFreshEventSeed } from '@/core/rng';
import { randomSeedPhrase } from '@/core/seed-phrase';
import type { Difficulty, GameMode } from '@/game/game-state';
import { presetFor } from '@/rules';
import { HUD_THEME } from './hud-theme';

/** The choices a New Game collects. */
export interface NewGameChoices {
  /** Map seed phrase. */
  seedPhrase: string;
  /** Selected map size key. */
  mapSize: MapSizeKey;
  /** AI difficulty. */
  difficulty: Difficulty;
  /** The fresh event-PRNG seed minted for this game. */
  eventSeed: string;
  /** Game mode preset (M_MODES). */
  mode: GameMode;
}

/** The 5 selectable game modes (M_MODES.7 — presets card row). */
const MODES: ReadonlyArray<{ key: GameMode; label: string; hint: string }> = [
  { key: 'red-vs-blue', label: 'Red vs Blue', hint: 'Balanced 1v1' },
  { key: 'skirmish', label: 'Skirmish', hint: 'Pure noise — asymmetric maps' },
  { key: 'endless', label: 'Endless', hint: 'Invuln bases · resign/starve' },
  { key: 'classic-rts', label: 'Classic RTS', hint: 'Longer · tech-tree heavy' },
  { key: '4x', label: '4X', hint: 'eXplore eXpand eXploit eXterminate' },
];

/** Props for the New Game modal. */
export interface NewGameModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal requests to close. */
  onOpenChange: (open: boolean) => void;
  /** Called with the choices when the player begins the game. */
  onBegin: (choices: NewGameChoices) => void;
}

/** The three AI difficulty options. */
const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

/** A segmented-control row of options. */
function Segmented<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              flex: 1,
              padding: '8px 6px',
              borderRadius: 8,
              border: `1px solid ${active ? HUD_THEME.color.accent : HUD_THEME.color.border}`,
              background: active ? 'rgba(56,189,248,0.2)' : 'rgba(0,0,0,0.3)',
              color: active ? HUD_THEME.color.accent : HUD_THEME.color.muted,
              fontFamily: HUD_THEME.font.body,
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The New Game modal (Radix Dialog) — collects the seed phrase, map size
 * (Huge is device-gated), and AI difficulty, then starts the game.
 *
 * Each time the modal opens it mints a fresh, purely-random event-PRNG seed;
 * the suggested seed phrase is the first draw from that event stream, so it
 * genuinely differs every open and every page load. The same event seed
 * travels with `onBegin` to become the committed session's event seed.
 */
export function NewGameModal({ open, onOpenChange, onBegin }: NewGameModalProps) {
  // the fresh event seed for the game being configured — re-minted each open
  const [eventSeed, setEventSeed] = useState(createFreshEventSeed);
  // the event PRNG stream derived from that seed; the shuffle draws from it
  const eventRng = useRef(createEventPrng(eventSeed));
  const [seedPhrase, setSeedPhrase] = useState(() => randomSeedPhrase(eventRng.current));
  const [mode, setMode] = useState<GameMode>('red-vs-blue');
  // The preset.mapSize is the default; the user can still override below.
  const [mapSize, setMapSize] = useState<MapSizeKey>(presetFor('red-vs-blue').mapSize);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [sizeKeys, setSizeKeys] = useState<MapSizeKey[]>(['small', 'medium', 'large']);

  // When mode changes, reset mapSize to the preset's recommended default
  // (player can override afterwards).
  useEffect(() => {
    setMapSize(presetFor(mode).mapSize);
  }, [mode]);
  // Keep DEFAULT_MAP_SIZE import live (it's referenced as a fallback elsewhere).
  void DEFAULT_MAP_SIZE;

  useEffect(() => {
    void availableMapSizes().then(setSizeKeys);
  }, []);

  // on each open, mint a fresh event seed + stream and re-suggest a phrase
  useEffect(() => {
    if (!open) return;
    const seed = createFreshEventSeed();
    setEventSeed(seed);
    eventRng.current = createEventPrng(seed);
    setSeedPhrase(randomSeedPhrase(eventRng.current));
  }, [open]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.8)', zIndex: 200 }}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(420px, 92vw)',
            background: HUD_THEME.color.panel,
            border: `1px solid ${HUD_THEME.color.border}`,
            borderRadius: 16,
            padding: 28,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            zIndex: 201,
          }}
        >
          <Dialog.Title
            style={{
              fontFamily: HUD_THEME.font.display,
              fontSize: '1.4rem',
              color: HUD_THEME.color.gold,
              margin: '0 0 18px',
            }}
          >
            New Realm
          </Dialog.Title>

          <label htmlFor="seed-input" style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted }}>
            Seed phrase
          </label>
          <div style={{ display: 'flex', gap: 8, margin: '6px 0 18px' }}>
            <input
              id="seed-input"
              value={seedPhrase}
              // M_SEC.8 — seed input cap + sanitise: 64 chars max, letters
              // and hyphens and spaces only, NFC-normalise (rejects RTL
              // overrides / zero-width joiners), autoComplete off so
              // browser autofill doesn't dump arbitrary text.
              maxLength={64}
              autoComplete="off"
              spellCheck={false}
              inputMode="text"
              onChange={(e) => {
                const cleaned = e.target.value
                  .normalize('NFC')
                  .replace(/[^a-z\- ]/gi, '')
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
          </div>

          <p style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted, margin: 0 }}>Game mode</p>
          <div style={{ margin: '6px 0 12px' }}>
            <Segmented
              value={mode}
              options={MODES.map((m) => m.key)}
              labels={
                Object.fromEntries(MODES.map((m) => [m.key, m.label])) as Record<GameMode, string>
              }
              onChange={setMode}
            />
          </div>
          <p style={{ fontSize: '0.66rem', color: HUD_THEME.color.muted, margin: '0 0 16px' }}>
            {MODES.find((m) => m.key === mode)?.hint}
          </p>

          <p style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted, margin: 0 }}>Map size</p>
          <div style={{ margin: '6px 0 18px' }}>
            <Segmented
              value={mapSize}
              options={sizeKeys}
              labels={
                Object.fromEntries(
                  (Object.keys(MAP_SIZES) as MapSizeKey[]).map((k) => [k, MAP_SIZES[k].label]),
                ) as Record<MapSizeKey, string>
              }
              onChange={setMapSize}
            />
          </div>

          <p style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted, margin: 0 }}>
            AI difficulty
          </p>
          <div style={{ margin: '6px 0 24px' }}>
            <Segmented
              value={difficulty}
              options={DIFFICULTIES}
              labels={{ easy: 'Easy', normal: 'Normal', hard: 'Hard' }}
              onChange={setDifficulty}
            />
          </div>

          <button
            type="button"
            id="begin-game"
            onClick={() =>
              onBegin({ seedPhrase: seedPhrase.trim(), mapSize, difficulty, eventSeed, mode })
            }
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              border: 'none',
              background: HUD_THEME.blueGradient,
              color: '#fff',
              fontFamily: HUD_THEME.font.display,
              fontSize: '1.1rem',
              cursor: 'pointer',
            }}
          >
            Begin
          </button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
