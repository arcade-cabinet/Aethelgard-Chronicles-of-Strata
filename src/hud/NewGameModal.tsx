import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { type MapSizeKey, MAP_SIZES, availableMapSizes, DEFAULT_MAP_SIZE } from '@/core/map-size';
import { randomSeedPhrase } from '@/core/seed-phrase';
import type { Difficulty } from '@/game/game-state';
import type { Rng } from '@/core/rng';
import { HUD_THEME } from './hud-theme';

/** The choices a New Game collects. */
export interface NewGameChoices {
  /** Map seed phrase. */
  seedPhrase: string;
  /** Selected map size key. */
  mapSize: MapSizeKey;
  /** AI difficulty. */
  difficulty: Difficulty;
}

/** Props for the New Game modal. */
export interface NewGameModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal requests to close. */
  onOpenChange: (open: boolean) => void;
  /** Event PRNG — drives the seed-phrase randomizer. */
  eventRng: Rng;
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
 * The New Game modal (Radix Dialog) — collects the seed phrase (with a
 * randomize button drawing from the event PRNG), the map size (Huge is
 * device-gated), and the AI difficulty, then starts the game.
 */
export function NewGameModal({ open, onOpenChange, eventRng, onBegin }: NewGameModalProps) {
  const [seedPhrase, setSeedPhrase] = useState(() => randomSeedPhrase(eventRng));
  const [mapSize, setMapSize] = useState<MapSizeKey>(DEFAULT_MAP_SIZE);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [sizeKeys, setSizeKeys] = useState<MapSizeKey[]>(['small', 'medium', 'large']);

  useEffect(() => {
    void availableMapSizes().then(setSizeKeys);
  }, []);

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

          <label style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted }}>Seed phrase</label>
          <div style={{ display: 'flex', gap: 8, margin: '6px 0 18px' }}>
            <input
              id="seed-input"
              value={seedPhrase}
              onChange={(e) => setSeedPhrase(e.target.value)}
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
              onClick={() => setSeedPhrase(randomSeedPhrase(eventRng))}
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

          <label style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted }}>Map size</label>
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

          <label style={{ fontSize: '0.72rem', color: HUD_THEME.color.muted }}>AI difficulty</label>
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
            onClick={() => onBegin({ seedPhrase: seedPhrase.trim(), mapSize, difficulty })}
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
