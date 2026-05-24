import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { availableMapSizes, MAP_SIZES, type MapSizeKey } from '@/core/map-size';
import { createEventPrng, createFreshEventSeed } from '@/core/rng';
import { randomSeedPhrase } from '@/core/seed-phrase';
import { ALL_PERSONALITIES, DEFAULT_PERSONALITY, personalityFor } from '@/config/ai-personalities';
import type { Difficulty, GameMode } from '@/game/game-state';
import { presetFor } from '@/rules';
import type { TurnsMode } from '@/rules/mode-presets';
import { HUD_THEME } from './hud-theme';
import { MapPreview } from './MapPreview';
import { DIFFICULTIES, MODES, PLAYER_COLORS, STARTING_BONUSES } from './new-game-options';
import { ModalShell } from './ModalShell';

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
  /**
   * M_TURNS.3 — Turn style override. Defaults to the preset's
   * turnsMode; the player can flip independently. real-time = tick
   * the sim every frame; turn-based = freeze sim between End Turn
   * presses (M_TURNS.1 actually enforces).
   */
  turnsMode: TurnsMode;
  /**
   * M_TURNS.2 — Max turns cap (turn-based only). null = uncapped.
   * Ignored when turnsMode === 'real-time'. Common picks: 30/60/90.
   */
  maxTurns: number | null;
  /**
   * M_EXPANSION.F.80 — player palette pick. CSS hex string or null
   * (= SKINS default = native KayKit colours).
   */
  playerColor: string | null;
  /**
   * M_EXPANSION.F.84 — starting bonus pick. 'none' = baseline; the
   * other picks each give a one-shot start-of-match advantage.
   */
  startingBonus: 'none' | 'extra-wood' | 'extra-peons' | 'extra-hp';
  /**
   * M_POLISH3.AIVAI.1 — when true, the player faction is also driven
   * by a yuka AI. Both factions auto-play; no human input is needed.
   * Used by the e2e playthrough harness and by spectator/demo mode.
   */
  aiVsAi: boolean;
  /** M_FUN.AI.PICKER — named opponent personality key. */
  enemyPersonality: string;
}

// M_SIMPLIFY.7 — STARTING_BONUSES / PLAYER_COLORS / MODES /
// DIFFICULTIES extracted to src/hud/new-game-options.ts. The data
// is static config; keeping it in the 600-line modal cost cognitive
// load every time someone read this component.

/** Props for the New Game modal. */
export interface NewGameModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal requests to close. */
  onOpenChange: (open: boolean) => void;
  /** Called with the choices when the player begins the game. */
  onBegin: (choices: NewGameChoices) => void;
}

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
  // M_AUDIT2.UX.16 — semantic radiogroup. Arrow keys move between
  // options; only the active option is in the tab order
  // (tabIndex={active ? 0 : -1}) so keyboard navigation through the
  // modal traverses 1 stop per group instead of N options per group.
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const idx = options.indexOf(value);
    const len = options.length;
    const nextIdx = e.key === 'ArrowRight' ? (idx + 1) % len : (idx - 1 + len) % len;
    const next = options[nextIdx];
    if (next !== undefined) onChange(next);
  };
  return (
    <div role="radiogroup" onKeyDown={onKey} style={{ display: 'flex', gap: 6 }}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          // biome-ignore lint/a11y/useSemanticElements: a real <input type=radio> can't carry the rich Segmented label styling we need (border/bg per state); the role=radio + arrow-key wiring below provides equivalent SR semantics.
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
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
  const [mode, setMode] = useState<GameMode>('border-clash');
  // The preset.mapSize is the default; the user can still override below.
  const [mapSize, setMapSize] = useState<MapSizeKey>(presetFor('border-clash').mapSize);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  // M_TURNS.3 — Turn style is the 3rd cascaded control. Defaults to
  // the preset's turnsMode; overriding flips the Custom Realm flag.
  const [turnsMode, setTurnsModeState] = useState<TurnsMode>(presetFor('border-clash').turnsMode);
  // M_TURNS.2 — Max turns cap. null = uncapped. Surfaces in UI only
  // when turnsMode === 'turn-based'. Cascades from the preset on
  // mode change; overriding flips the Custom Realm flag.
  const [maxTurns, setMaxTurnsState] = useState<number | null>(presetFor('border-clash').maxTurns);
  // M_EXPANSION.F.80 — player palette pick. 'default' = null (use
  // SKINS native colours). Independent of preset cascade (palette
  // is purely cosmetic; doesn't depend on game mode).
  const [playerColorKey, setPlayerColorKey] = useState<string>('default');
  // M_EXPANSION.F.84 — starting bonus pick. Independent of preset
  // cascade — a bonus is the player's pre-match handicap dial,
  // orthogonal to the game-mode choice.
  const [startingBonus, setStartingBonus] = useState<NewGameChoices['startingBonus']>('none');
  // M_POLISH3.AIVAI.1 — AI-vs-AI mode toggle. Both factions auto-play.
  const [aiVsAi, setAiVsAi] = useState(false);
  // M_FUN.AI.PICKER — named opponent. Defaults to the registry default.
  const [enemyPersonality, setEnemyPersonality] = useState<string>(DEFAULT_PERSONALITY);
  const [sizeKeys, setSizeKeys] = useState<MapSizeKey[]>(['small', 'medium', 'large']);

  // M_BRAND.3 — when the player overrides any cascaded control after
  // picking a preset, the modal flips to "Custom Realm" state. The
  // mutation is what *teaches* the player that customization = leaving
  // the preset. The flag clears whenever the player explicitly clicks
  // a mode chip (re-locking the preset).
  const [presetModified, setPresetModified] = useState(false);

  // M_BRAND.2 — diegetic preset cascade. When mode changes, push the
  // preset's mapSize AND its AI difficulty (long-reign + frontier-raid
  // run easier; strata-wars + age-of-strata default to normal) into
  // the visible controls. The player sees the cascade happen.
  useEffect(() => {
    const preset = presetFor(mode);
    setMapSize(preset.mapSize);
    // Each preset implies a default AI difficulty. Border-clash is
    // balanced 1v1 (normal); long-reign is endless attrition (easy
    // is the entry experience); frontier-raid is fast (normal);
    // strata-wars / age-of-strata reward longer planning (normal).
    const aiByMode: Record<GameMode, Difficulty> = {
      'border-clash': 'normal',
      'frontier-raid': 'normal',
      'long-reign': 'easy',
      'strata-wars': 'normal',
      'age-of-strata': 'normal',
      coexistence: 'easy',
    };
    setDifficulty(aiByMode[mode]);
    setTurnsModeState(preset.turnsMode);
    setMaxTurnsState(preset.maxTurns);
    setPresetModified(false);
  }, [mode]);

  // Override wrappers that flip the "Custom Realm" marker (M_BRAND.3).
  const setMapSizeOverride = (next: MapSizeKey) => {
    setMapSize(next);
    if (next !== presetFor(mode).mapSize) setPresetModified(true);
  };
  const setDifficultyOverride = (next: Difficulty) => {
    setDifficulty(next);
    setPresetModified(true);
  };
  const setTurnsModeOverride = (next: TurnsMode) => {
    setTurnsModeState(next);
    if (next !== presetFor(mode).turnsMode) setPresetModified(true);
  };
  // M_TURNS.2 — maxTurns is a 4-way pick (30 / 60 / 90 / Unlimited).
  // Maps to the segmented control's string options; null encodes
  // Unlimited.
  const setMaxTurnsOverride = (next: string) => {
    if (next === 'unlimited') {
      setMaxTurnsState(null);
      if (presetFor(mode).maxTurns !== null) setPresetModified(true);
      return;
    }
    // M_SEC_REVIEW.7 — guard parseInt result. Today's only caller
    // is the segmented control (4 fixed string values), but if a
    // future URL parameter or programmatic call passes a non-numeric
    // string, parseInt returns NaN. game.turn.maxTurns === NaN
    // makes the turn-cap check `turnsElapsed >= maxTurns` always
    // false, silently disabling the cap. Reject < 1 too.
    const val = Number.parseInt(next, 10);
    if (!Number.isFinite(val) || val < 1) return;
    setMaxTurnsState(val);
    if (val !== presetFor(mode).maxTurns) setPresetModified(true);
  };
  const maxTurnsValue: string = maxTurns === null ? 'unlimited' : String(maxTurns);

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
      {/* M_MICRO.10.1 — ModalShell with NewGameModal's larger card. */}
      <ModalShell
        zIndex={200}
        // M_POLISH2.M.5 — 92vw + the 28px ModalShell padding combined
        // math'd to 14px overflow past the viewport right edge on
        // 375px portrait. calc(100vw - 32px) gives a guaranteed
        // 16px margin on each side regardless of padding.
        width="min(420px, calc(100vw - 32px))"
        // M_AUDIT2.UX.6 — keyboard-overflow-safe height. On phone
        // portrait with the virtual keyboard open, the seed text
        // field forces the modal taller than the visible viewport
        // and the Begin button slides off-screen. Cap at the
        // safe-area-aware visual viewport min (svh respects the
        // keyboard inset on modern browsers; the dvh fallback covers
        // older WebViews) and let the inner scroller take over.
        maxHeight="min(85svh, 85dvh, 700px)"
        contentStyle={{
          border: `1px solid ${HUD_THEME.color.border}`,
          borderRadius: 16,
          padding: 28,
          fontFamily: HUD_THEME.font.body,
          display: 'flex',
          flexDirection: 'column',
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

        {/*
          M_EXPANSION.F.83 — map preview thumbnail. Regenerates each
          time the seed phrase or mapSize changes so the player sees
          the actual layout before committing.
        */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 16px' }}>
          <MapPreview
            seedPhrase={seedPhrase.trim() || 'preview'}
            mapRadius={MAP_SIZES[mapSize].radius}
            size={200}
          />
        </div>

        {/*
          M_BRAND.3 — picker sits under a "Realm Presets" heading; the
          live "Custom Realm" annotation appears once the player
          alters a cascaded control, communicating that customization
          = leaving the preset.
        */}
        <p
          style={{
            fontSize: '0.78rem',
            color: HUD_THEME.color.muted,
            margin: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Realm preset</span>
          {presetModified && (
            <span style={{ color: HUD_THEME.color.gold, fontSize: '0.72rem' }}>Custom Realm</span>
          )}
        </p>
        <div style={{ margin: '6px 0 18px' }}>
          <Segmented
            value={mode}
            options={MODES.map((m) => m.key)}
            labels={
              Object.fromEntries(MODES.map((m) => [m.key, m.label])) as Record<GameMode, string>
            }
            onChange={setMode}
          />
        </div>

        {/*
          M_BRAND.2 — diegetic cascade. Picking a preset above visibly
          mutates Map size + AI difficulty below; if the player then
          touches either, M_BRAND.3 flips the heading annotation.
        */}
        <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Map size</p>
        <div style={{ margin: '6px 0 18px' }}>
          <Segmented
            value={mapSize}
            options={sizeKeys}
            labels={
              Object.fromEntries(
                (Object.keys(MAP_SIZES) as MapSizeKey[]).map((k) => [k, MAP_SIZES[k].label]),
              ) as Record<MapSizeKey, string>
            }
            onChange={setMapSizeOverride}
          />
        </div>

        <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>
          AI difficulty
        </p>
        <div style={{ margin: '6px 0 18px' }}>
          <Segmented
            value={difficulty}
            options={DIFFICULTIES}
            labels={{ easy: 'Easy', normal: 'Normal', hard: 'Hard' }}
            onChange={setDifficultyOverride}
          />
        </div>

        {/*
          M_TURNS.3 — Turn style is the 3rd cascaded control. Picking
          a preset that's turn-based (today only age-of-strata) flips
          this to "Turn-based" automatically. Overriding sets the
          Custom Realm flag.
        */}
        <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Turn style</p>
        <div style={{ margin: '6px 0 18px' }}>
          <Segmented
            value={turnsMode}
            options={['real-time', 'turn-based'] as const}
            labels={{ 'real-time': 'Real-time', 'turn-based': 'Turn-based' }}
            onChange={setTurnsModeOverride}
          />
        </div>

        {/*
          M_EXPANSION.F.80 — Player palette swap. Purely cosmetic;
          doesn't cascade with the preset. 5 picks: Default (SKINS
          native) + Red/Blue/Green/Yellow. Selected hex is passed
          through choices.playerColor and read by Units.tsx to tint
          every player-faction character mesh.
        */}
        <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>
          Player colour
        </p>
        <div style={{ margin: '6px 0 18px' }}>
          <Segmented
            value={playerColorKey}
            options={PLAYER_COLORS.map((c) => c.key)}
            labels={Object.fromEntries(PLAYER_COLORS.map((c) => [c.key, c.label]))}
            onChange={setPlayerColorKey}
          />
        </div>

        {/*
          M_EXPANSION.F.84 — Starting bonus pick. Orthogonal to the
          preset; doesn't trip Custom Realm. The AI never gets a
          bonus — this IS the player's pre-match handicap dial.
        */}
        <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>
          Starting bonus
        </p>
        <div style={{ margin: '6px 0 18px' }}>
          <Segmented
            value={startingBonus}
            options={STARTING_BONUSES.map((b) => b.key)}
            labels={
              Object.fromEntries(STARTING_BONUSES.map((b) => [b.key, b.label])) as Record<
                NewGameChoices['startingBonus'],
                string
              >
            }
            onChange={(v) => setStartingBonus(v as NewGameChoices['startingBonus'])}
          />
        </div>

        {/*
          M_TURNS.2 — Max turns control. Visible only when
          turn-based — the cap is meaningless in real-time mode
          (which has no turn counter). Picks: 30 / 60 / 90 /
          Unlimited. age-of-strata default is 60.
        */}
        {turnsMode === 'turn-based' && (
          <>
            <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>
              Max turns
            </p>
            <div style={{ margin: '6px 0 24px' }}>
              <Segmented
                value={maxTurnsValue}
                options={['30', '60', '90', 'unlimited'] as const}
                labels={{ '30': '30', '60': '60', '90': '90', unlimited: 'Unlimited' }}
                onChange={setMaxTurnsOverride}
              />
            </div>
          </>
        )}

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

        {/* M_AUDIT2.UX.6 — sticky bottom Begin CTA. The above form
            sections scroll inside the flex column when the modal hits
            its maxHeight; the button stays pinned so a thumb on
            phone-portrait can always reach it without scroll-hunting. */}
        <div
          style={{
            position: 'sticky',
            bottom: -28, // bleed into modal padding so there's no double border
            marginInline: -28,
            paddingInline: 28,
            paddingTop: 14,
            paddingBottom: 14,
            background: HUD_THEME.color.panel,
            borderTop: `1px solid ${HUD_THEME.color.border}`,
            marginTop: 'auto',
          }}
        >
          <button
            type="button"
            id="begin-game"
            onClick={() =>
              onBegin({
                seedPhrase: seedPhrase.trim(),
                mapSize,
                difficulty,
                eventSeed,
                mode,
                turnsMode,
                // M_TURNS.2 — maxTurns is meaningful only in turn-based
                // mode; passing it through unconditionally is safe
                // because the runtime ignores it in real-time.
                maxTurns,
                // M_EXPANSION.F.80 — palette pick (null = default).
                playerColor: PLAYER_COLORS.find((c) => c.key === playerColorKey)?.hex ?? null,
                // M_EXPANSION.F.84 — starting bonus pick.
                startingBonus,
                // M_POLISH3.AIVAI.1 — both factions auto-play when set.
                aiVsAi,
                // M_FUN.AI.PICKER — named opponent personality.
                enemyPersonality,
              })
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
        </div>
      </ModalShell>
    </Dialog.Root>
  );
}
