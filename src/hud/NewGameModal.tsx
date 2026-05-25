/**
 * M_FUN.REFACTOR.NEWGAMEMODAL-SPLIT — NewGameModal down to ~200 lines.
 *
 * Subcomponents extracted:
 *   Segmented      → src/hud/Segmented.tsx
 *   SeedField      → src/hud/SeedField.tsx
 *   PresetControls → src/hud/PresetControls.tsx
 *   OpponentPicker → src/hud/OpponentPicker.tsx
 *
 * This file owns only: dialog shell, all state, preset cascade effects,
 * override wrappers, onBegin assembly, and the sticky Begin CTA.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useRef, useState } from 'react';
import { availableMapSizes, MAP_SIZES, type MapSizeKey } from '@/core/map-size';
import { createEventPrng, createFreshEventSeed } from '@/core/rng';
import { randomSeedPhrase } from '@/core/seed-phrase';
import { DEFAULT_PERSONALITY } from '@/config/ai-personalities';
import { defaultFactionColors } from '@/config/faction-palette';
import { buildDefaultFactions, type FactionConfig, LEGACY_FACTIONS } from '@/config/factions';
import type { Difficulty, GameMode } from '@/game/game-state';
import { presetFor } from '@/rules';
import type { TurnsMode } from '@/rules/mode-presets';
import { HUD_THEME } from './hud-theme';
import { MapPreview } from './MapPreview';
import { PLAYER_COLORS } from './new-game-options';
import { ModalShell } from './ModalShell';
import { SeedField } from './SeedField';
import { PresetControls } from './PresetControls';
import { FactionColorPicker } from './FactionColorPicker';
import { OpponentPicker } from './OpponentPicker';

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
  /**
   * M_PIVOT.N-PLAYER.COLOR-PICKER — explicit faction registry. When
   * omitted, startGame falls back to LEGACY_FACTIONS with default
   * colors. For v0.5 this carries the two visible faction-color
   * picks from the modal so ZoneBorder + HUD chips render with the
   * user's chosen banner colors instead of the historical blue/red.
   */
  factions?: FactionConfig[];
}

// M_SIMPLIFY.7 — STARTING_BONUSES / PLAYER_COLORS / MODES /
// DIFFICULTIES extracted to src/hud/new-game-options.ts. The data
// is static config; keeping it in the modal cost cognitive load
// every time someone read this component.

/** Props for the New Game modal. */
export interface NewGameModalProps {
  /** Whether the modal is open. */
  open: boolean;
  /** Called when the modal requests to close. */
  onOpenChange: (open: boolean) => void;
  /** Called with the choices when the player begins the game. */
  onBegin: (choices: NewGameChoices) => void;
}

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
  // M_PIVOT.N-PLAYER.COLOR-PICKER — per-faction banner colors. Default
  // is a deterministic seed-derived shuffle of the 12-color palette so
  // a 2-player default still gets two distinct chips. The player can
  // re-pick via the FactionColorPicker; the chosen pair flows into
  // NewGameChoices.factions so startGame seeds the registry with them.
  const [factionColors, setFactionColors] = useState<{ player: string; enemy: string }>(() => {
    const [p, e] = defaultFactionColors(2, seedPhrase);
    // LEGACY_FACTIONS has exactly 2 entries (asserted in factions.test).
    const legacyPlayer = LEGACY_FACTIONS[0]?.color ?? '#3b82f6';
    const legacyEnemy = LEGACY_FACTIONS[1]?.color ?? '#ef4444';
    return {
      player: p ?? legacyPlayer,
      enemy: e ?? legacyEnemy,
    };
  });
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

        <SeedField seedPhrase={seedPhrase} setSeedPhrase={setSeedPhrase} eventRng={eventRng} />

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

        <PresetControls
          mode={mode}
          setMode={setMode}
          mapSize={mapSize}
          setMapSize={setMapSizeOverride}
          sizeKeys={sizeKeys}
          difficulty={difficulty}
          setDifficulty={setDifficultyOverride}
          turnsMode={turnsMode}
          setTurnsMode={setTurnsModeOverride}
          maxTurnsValue={maxTurnsValue}
          setMaxTurns={setMaxTurnsOverride}
          playerColorKey={playerColorKey}
          setPlayerColorKey={setPlayerColorKey}
          startingBonus={startingBonus}
          setStartingBonus={setStartingBonus}
          presetModified={presetModified}
        />

        <OpponentPicker
          aiVsAi={aiVsAi}
          setAiVsAi={setAiVsAi}
          enemyPersonality={enemyPersonality}
          setEnemyPersonality={setEnemyPersonality}
        />

        {/* M_PIVOT.N-PLAYER.COLOR-PICKER — per-faction banner color
            picker. v0.5 substrate ships two slots (player + enemy);
            M_PIVOT.MODES.4X grows this to N slots for N-player FFA. */}
        <div
          data-testid="faction-colors-row"
          style={{
            display: 'flex',
            gap: 16,
            alignItems: 'center',
            margin: '12px 0 4px',
            fontSize: 13,
            color: HUD_THEME.color.muted,
          }}
        >
          <span style={{ flex: 0 }}>Faction colors:</span>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>Player</span>
            <FactionColorPicker
              color={factionColors.player}
              onChange={(c) => setFactionColors((prev) => ({ ...prev, player: c }))}
              ariaLabel="Player faction color"
            />
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>Enemy</span>
            <FactionColorPicker
              color={factionColors.enemy}
              onChange={(c) => setFactionColors((prev) => ({ ...prev, enemy: c }))}
              ariaLabel="Enemy faction color"
            />
          </div>
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
                // M_PIVOT.N-PLAYER.COLOR-PICKER + M_PIVOT.MODES.4X —
                // explicit faction registry. For 2-faction modes,
                // seed the legacy player+enemy slots with the user's
                // color picks. For 4X mode (age-of-strata, defaultPlayerCount=6),
                // generate a 6-faction registry — the modal exposes
                // only the first two color pickers today; remaining
                // slots get default-shuffled palette colors and AI control.
                factions: ((): FactionConfig[] => {
                  const preset = presetFor(mode);
                  if (preset.defaultPlayerCount <= 2) {
                    return [
                      {
                        ...LEGACY_FACTIONS[0],
                        color: factionColors.player,
                      } as FactionConfig,
                      {
                        ...LEGACY_FACTIONS[1],
                        color: factionColors.enemy,
                        personality: enemyPersonality,
                      } as FactionConfig,
                    ];
                  }
                  // N-player mode: build a full registry. First two
                  // colors come from the picker; remaining N-2 from the
                  // seed-derived palette shuffle.
                  const allColors = defaultFactionColors(preset.defaultPlayerCount, seedPhrase);
                  // Override the first two with the user picks.
                  allColors[0] = factionColors.player;
                  allColors[1] = factionColors.enemy;
                  const registry = buildDefaultFactions(preset.defaultPlayerCount, allColors);
                  // Patch the enemy slot's personality with the picker's pick.
                  if (registry[1]) registry[1] = { ...registry[1], personality: enemyPersonality };
                  return registry;
                })(),
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
