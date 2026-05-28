/**
 * M_FUN.REFACTOR.NEWGAMEMODAL-SPLIT — Preset controls panel: mode picker,
 * map size, AI difficulty, turn style, max turns (conditional), player
 * colour, starting bonus. Extracted from NewGameModal.tsx.
 */
import type { MapSizeKey } from '@/core/map-size';
import { MAP_SIZES } from '@/core/map-size';
import type { Difficulty, GameMode } from '@/game/game-state';
import type { TurnsMode } from '@/rules/mode-presets';
import { HUD_THEME } from '../theme';
import type { NewGameChoices } from './new-game-options';
import { DIFFICULTIES, MODES, PLAYER_COLORS, STARTING_BONUSES } from './new-game-options';
import { Segmented } from '../primitives';

export interface PresetControlsProps {
  mode: GameMode;
  setMode: (mode: GameMode) => void;
  mapSize: MapSizeKey;
  setMapSize: (size: MapSizeKey) => void;
  sizeKeys: MapSizeKey[];
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  turnsMode: TurnsMode;
  setTurnsMode: (t: TurnsMode) => void;
  maxTurnsValue: string;
  setMaxTurns: (v: string) => void;
  playerColorKey: string;
  setPlayerColorKey: (key: string) => void;
  startingBonus: NewGameChoices['startingBonus'];
  setStartingBonus: (b: NewGameChoices['startingBonus']) => void;
  /** True when the player has overridden any cascaded preset control. */
  presetModified: boolean;
}

/** All cascaded preset controls: mode → size/difficulty/turns → cosmetic picks. */
export function PresetControls({
  mode,
  setMode,
  mapSize,
  setMapSize,
  sizeKeys,
  difficulty,
  setDifficulty,
  turnsMode,
  setTurnsMode,
  maxTurnsValue,
  setMaxTurns,
  playerColorKey,
  setPlayerColorKey,
  startingBonus,
  setStartingBonus,
  presetModified,
}: PresetControlsProps) {
  return (
    <>
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
          onChange={setMapSize}
        />
      </div>

      <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>AI difficulty</p>
      <div style={{ margin: '6px 0 18px' }}>
        <Segmented
          value={difficulty}
          options={DIFFICULTIES}
          labels={{ easy: 'Easy', normal: 'Normal', hard: 'Hard' }}
          onChange={setDifficulty}
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
          onChange={setTurnsMode}
        />
      </div>

      {/*
        M_EXPANSION.F.80 — Player palette swap. Purely cosmetic;
        doesn't cascade with the preset. 5 picks: Default (SKINS
        native) + Red/Blue/Green/Yellow. Selected hex is passed
        through choices.playerColor and read by Units.tsx to tint
        every player-faction character mesh.
      */}
      <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Player colour</p>
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
      <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Starting bonus</p>
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
          <p style={{ fontSize: '0.78rem', color: HUD_THEME.color.muted, margin: 0 }}>Max turns</p>
          <div style={{ margin: '6px 0 24px' }}>
            <Segmented
              value={maxTurnsValue}
              options={['30', '60', '90', 'unlimited'] as const}
              labels={{ '30': '30', '60': '60', '90': '90', unlimited: 'Unlimited' }}
              onChange={setMaxTurns}
            />
          </div>
        </>
      )}
    </>
  );
}
