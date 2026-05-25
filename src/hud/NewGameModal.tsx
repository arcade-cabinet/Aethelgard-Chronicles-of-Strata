/**
 * NewGameModal — cinematic full-page setup screen (M_HUD.SHELL.3).
 *
 * Adopted from the 21st.dev Magic reference for an AAA-fantasy game-setup
 * modal: card-grouped sections (World / Mode / Opponents / Players)
 * inside a Radix Dialog, sticky header + footer, gold-gradient Begin
 * CTA with live config-readout chips, framer-motion staggered entry.
 *
 * Aethelgard-specific: REUSES the stable subcomponents (SeedField,
 * MapPreview, PresetControls, OpponentPicker, FactionColorPicker)
 * instead of reimplementing them, preserves the 13-field NewGameChoices
 * shape, and keeps every data-testid the test suite pins (begin-game,
 * n-player-picker, n-player-slider, n-player-count, n-player-color-slots,
 * n-player-slot-${i}, faction-colors-row).
 */
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Bot, Crown, Gamepad2, Map as MapIcon, Palette, Sparkles, Swords, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PERSONALITY } from '@/config/ai-personalities';
import { defaultFactionColors } from '@/config/faction-palette';
import { buildDefaultFactions, type FactionConfig, LEGACY_FACTIONS } from '@/config/factions';
import { availableMapSizes, MAP_SIZES, type MapSizeKey } from '@/core/map-size';
import { createEventPrng, createFreshEventSeed } from '@/core/rng';
import { randomSeedPhrase } from '@/core/seed-phrase';
import type { Difficulty, GameMode } from '@/game/game-state';
import { cn } from '@/lib/cn';
import { presetFor } from '@/rules';
import type { TurnsMode } from '@/rules/mode-presets';
import { FactionColorPicker } from './FactionColorPicker';
import { MapPreview } from './MapPreview';
import { PLAYER_COLORS } from './new-game-options';
import { OpponentPicker } from './OpponentPicker';
import { PresetControls } from './PresetControls';
import { SeedField } from './SeedField';

/** The choices a New Game collects. */
export interface NewGameChoices {
  seedPhrase: string;
  mapSize: MapSizeKey;
  difficulty: Difficulty;
  eventSeed: string;
  mode: GameMode;
  turnsMode: TurnsMode;
  maxTurns: number | null;
  playerColor: string | null;
  startingBonus: 'none' | 'extra-wood' | 'extra-peons' | 'extra-hp';
  aiVsAi: boolean;
  enemyPersonality: string;
  factions?: FactionConfig[];
}

export interface NewGameModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBegin: (choices: NewGameChoices) => void;
}

/** Reusable section card with a heading + icon + caption. */
function SectionCard({
  icon: Icon,
  title,
  caption,
  children,
  delay = 0,
  reducedMotion,
}: {
  icon: typeof MapIcon;
  title: string;
  caption?: string;
  children: React.ReactNode;
  delay?: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.section
      initial={reducedMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'rounded-2xl border bg-[rgba(15,23,42,0.55)] backdrop-blur',
        'border-[var(--color-border-hud)]',
        'shadow-[0_6px_24px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(56,189,248,0.06)]',
      )}
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-[var(--color-border-hud)] px-5 pb-3 pt-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-[var(--color-gold-hud)]" aria-hidden />
          <h3
            className="font-display text-base font-semibold tracking-[0.08em] text-[var(--color-gold-hud)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h3>
        </div>
        {caption && (
          <p className="hidden text-xs italic text-[var(--color-muted-hud)] sm:block">{caption}</p>
        )}
      </header>
      <div className="px-5 py-4">{children}</div>
    </motion.section>
  );
}

export function NewGameModal({ open, onOpenChange, onBegin }: NewGameModalProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [eventSeed, setEventSeed] = useState(createFreshEventSeed);
  const eventRng = useRef(createEventPrng(eventSeed));
  const [seedPhrase, setSeedPhrase] = useState(() => randomSeedPhrase(eventRng.current));
  const [mode, setMode] = useState<GameMode>('border-clash');
  const [mapSize, setMapSize] = useState<MapSizeKey>(presetFor('border-clash').mapSize);
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');
  const [turnsMode, setTurnsModeState] = useState<TurnsMode>(presetFor('border-clash').turnsMode);
  const [maxTurns, setMaxTurnsState] = useState<number | null>(presetFor('border-clash').maxTurns);
  const [playerColorKey, setPlayerColorKey] = useState<string>('skins-default');
  const [startingBonus, setStartingBonus] = useState<NewGameChoices['startingBonus']>('none');
  const [aiVsAi, setAiVsAi] = useState(false);
  const [enemyPersonality, setEnemyPersonality] = useState(DEFAULT_PERSONALITY);
  const [presetModified, setPresetModified] = useState(false);
  const [sizeKeys, setSizeKeys] = useState<MapSizeKey[]>([]);
  const [factionColors, setFactionColors] = useState<{ player: string; enemy: string }>({
    player: '#38bdf8',
    enemy: '#f43f5e',
  });
  const [nPlayer, setNPlayer] = useState(presetFor('border-clash').defaultPlayerCount);
  const [nPlayerColors, setNPlayerColors] = useState<string[]>(() =>
    defaultFactionColors(presetFor('border-clash').defaultPlayerCount, seedPhrase),
  );

  // Cascade: mode change resets preset-derived fields.
  useEffect(() => {
    const preset = presetFor(mode);
    setMapSize(preset.mapSize);
    const aiByMode: Record<GameMode, Difficulty> = {
      'border-clash': 'normal',
      'frontier-raid': 'hard',
      'long-reign': 'normal',
      'strata-wars': 'normal',
      'age-of-strata': 'normal',
      coexistence: 'easy',
    };
    setDifficulty(aiByMode[mode]);
    setTurnsModeState(preset.turnsMode);
    setMaxTurnsState(preset.maxTurns);
    setPresetModified(false);
    const n = preset.defaultPlayerCount;
    setNPlayer(n);
    setNPlayerColors(defaultFactionColors(n, seedPhrase));
    // biome-ignore lint/correctness/useExhaustiveDependencies: seedPhrase intentionally excluded — re-seeding on every keystroke would discard slot customisations.
  }, [mode]);

  // Override wrappers that flip the "Custom Realm" marker.
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
  const setMaxTurnsOverride = (next: string) => {
    if (next === 'unlimited') {
      setMaxTurnsState(null);
      if (presetFor(mode).maxTurns !== null) setPresetModified(true);
      return;
    }
    const val = Number.parseInt(next, 10);
    if (!Number.isFinite(val) || val < 1) return;
    setMaxTurnsState(val);
    if (val !== presetFor(mode).maxTurns) setPresetModified(true);
  };
  const maxTurnsValue: string = maxTurns === null ? 'unlimited' : String(maxTurns);

  useEffect(() => {
    void availableMapSizes().then(setSizeKeys);
  }, []);

  // On each open: mint a fresh event seed + stream + suggest a new phrase.
  useEffect(() => {
    if (!open) return;
    const seed = createFreshEventSeed();
    setEventSeed(seed);
    eventRng.current = createEventPrng(seed);
    setSeedPhrase(randomSeedPhrase(eventRng.current));
  }, [open]);

  // Live readout chips for the sticky footer.
  const readout = useMemo(
    () => [
      { label: seedPhrase.trim() || 'random seed', icon: Sparkles },
      { label: mapSize, icon: MapIcon },
      { label: mode.replace(/-/g, ' '), icon: Gamepad2 },
      {
        label: mode === 'age-of-strata' ? `${nPlayer} players` : '2 players',
        icon: Crown,
      },
    ],
    [seedPhrase, mapSize, mode, nPlayer],
  );

  const beginDisabled = !seedPhrase.trim();

  const buildFactions = (): FactionConfig[] => {
    const preset = presetFor(mode);
    if (mode !== 'age-of-strata' && preset.defaultPlayerCount <= 2) {
      const [lp, le] = LEGACY_FACTIONS;
      if (!lp || !le) {
        return buildDefaultFactions(preset.defaultPlayerCount, nPlayerColors);
      }
      const p1: FactionConfig = {
        id: lp.id,
        displayName: lp.displayName,
        kind: lp.kind,
        archetype: lp.archetype,
        color: factionColors.player,
      };
      const p2: FactionConfig = {
        id: le.id,
        displayName: le.displayName,
        kind: le.kind,
        archetype: le.archetype,
        color: factionColors.enemy,
        personality: enemyPersonality,
      };
      return [p1, p2];
    }
    const registry = buildDefaultFactions(nPlayer, nPlayerColors);
    if (registry[1]) registry[1] = { ...registry[1], personality: enemyPersonality };
    return registry;
  };

  const handleBegin = () => {
    onBegin({
      seedPhrase: seedPhrase.trim(),
      mapSize,
      difficulty,
      eventSeed,
      mode,
      turnsMode,
      maxTurns,
      playerColor: PLAYER_COLORS.find((c) => c.key === playerColorKey)?.hex ?? null,
      startingBonus,
      aiVsAi,
      enemyPersonality,
      factions: buildFactions(),
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="fixed inset-0 bg-black/65 backdrop-blur-sm"
                style={{ zIndex: 'var(--z-modal-overlay)' }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col',
                  'w-[min(760px,calc(100vw-32px))] max-h-[min(88dvh,860px)] overflow-hidden',
                  'rounded-3xl border bg-[var(--color-panel-solid)] text-[var(--color-text-hud)]',
                  'border-[var(--color-border-hud)] shadow-2xl',
                )}
                style={{
                  zIndex: 'var(--z-modal-content)',
                  paddingTop: 'var(--safe-top)',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <header className="flex items-start justify-between gap-4 border-b border-[var(--color-border-hud)] px-7 pb-4 pt-6">
                  <div>
                    <Dialog.Title
                      className="font-display text-2xl font-bold tracking-[0.06em] text-[var(--color-gold-hud)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Forge Your Realm
                    </Dialog.Title>
                    <Dialog.Description className="mt-1 text-xs italic text-[var(--color-muted-hud)]">
                      Configure the world before you set foot upon it.
                    </Dialog.Description>
                  </div>
                  <div className="flex items-center gap-2">
                    {presetModified && (
                      <span
                        data-testid="preset-modified-indicator"
                        className="flex items-center gap-1 rounded-full border border-[var(--color-accent-hud)]/40 bg-[var(--color-accent-hud)]/10 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.18em] text-[var(--color-accent-hud)]"
                      >
                        <Sparkles className="h-3 w-3" aria-hidden /> Custom realm
                      </span>
                    )}
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label="Close New Game setup"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-muted-hud)] hover:bg-white/5 hover:text-[var(--color-text-hud)]"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </button>
                    </Dialog.Close>
                  </div>
                </header>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  <div className="flex flex-col gap-4">
                    <SectionCard
                      icon={MapIcon}
                      title="World"
                      caption="Generates terrain, resources, ramps."
                      delay={0.02}
                      reducedMotion={reducedMotion}
                    >
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px]">
                        <SeedField
                          seedPhrase={seedPhrase}
                          setSeedPhrase={setSeedPhrase}
                          eventRng={eventRng}
                        />
                        <div className="flex items-center justify-center rounded-xl border border-[var(--color-border-hud)] bg-black/30 p-2">
                          <MapPreview
                            seedPhrase={seedPhrase.trim() || 'preview'}
                            mapRadius={MAP_SIZES[mapSize].radius}
                            size={200}
                          />
                        </div>
                      </div>
                    </SectionCard>

                    <SectionCard
                      icon={Gamepad2}
                      title="Mode"
                      caption="How the realm is won."
                      delay={0.06}
                      reducedMotion={reducedMotion}
                    >
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
                    </SectionCard>

                    <SectionCard
                      icon={Bot}
                      title="Opponents"
                      caption="Personality drives diplomacy and war hunger."
                      delay={0.1}
                      reducedMotion={reducedMotion}
                    >
                      <OpponentPicker
                        aiVsAi={aiVsAi}
                        setAiVsAi={setAiVsAi}
                        enemyPersonality={enemyPersonality}
                        setEnemyPersonality={setEnemyPersonality}
                      />
                    </SectionCard>

                    {mode === 'age-of-strata' && (
                      <SectionCard
                        icon={Crown}
                        title="Players"
                        caption="Free-for-all across N factions, each with its own throne."
                        delay={0.14}
                        reducedMotion={reducedMotion}
                      >
                        <div data-testid="n-player-picker" className="flex flex-col gap-4">
                          <div className="flex items-center gap-4">
                            <label
                              htmlFor="n-player-slider"
                              className="shrink-0 text-sm text-[var(--color-muted-hud)]"
                            >
                              Count
                            </label>
                            <input
                              id="n-player-slider"
                              type="range"
                              min={2}
                              max={6}
                              step={1}
                              value={nPlayer}
                              data-testid="n-player-slider"
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                setNPlayer(n);
                                setNPlayerColors((prev) => {
                                  const extra = defaultFactionColors(n, seedPhrase);
                                  return Array.from(
                                    { length: n },
                                    (_, i) => prev[i] ?? extra[i] ?? '#888',
                                  );
                                });
                              }}
                              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-[var(--color-border-hud)] accent-[var(--color-gold-hud)]"
                            />
                            <span
                              data-testid="n-player-count"
                              className="min-w-[2ch] text-right font-display text-2xl text-[var(--color-gold-hud)]"
                              style={{ fontFamily: 'var(--font-display)' }}
                            >
                              {nPlayer}
                            </span>
                          </div>
                          <div
                            data-testid="n-player-color-slots"
                            className="flex flex-col gap-2"
                          >
                            <AnimatePresence initial={false}>
                              {Array.from({ length: nPlayer }, (_, i) => {
                                const isYou = i === 0;
                                return (
                                  <motion.div
                                    // biome-ignore lint/suspicious/noArrayIndexKey: slot index IS the identity.
                                    key={`n-player-slot-${i}`}
                                    data-testid={`n-player-slot-${i}`}
                                    initial={
                                      reducedMotion
                                        ? false
                                        : { opacity: 0, x: -8, height: 0 }
                                    }
                                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                                    exit={
                                      reducedMotion
                                        ? { opacity: 0 }
                                        : { opacity: 0, x: -8, height: 0 }
                                    }
                                    transition={{ duration: 0.18 }}
                                    className="flex items-center gap-3 rounded-lg border border-[var(--color-border-hud)] bg-black/20 px-3 py-2"
                                  >
                                    {isYou ? (
                                      <Crown
                                        className="h-4 w-4 text-[var(--color-gold-hud)]"
                                        aria-hidden
                                      />
                                    ) : (
                                      <Bot
                                        className="h-4 w-4 text-[var(--color-muted-hud)]"
                                        aria-hidden
                                      />
                                    )}
                                    <span className="w-16 shrink-0 text-sm">
                                      {isYou ? 'You' : `AI ${i}`}
                                    </span>
                                    <FactionColorPicker
                                      color={nPlayerColors[i] ?? '#888888'}
                                      onChange={(c) =>
                                        setNPlayerColors((prev) => {
                                          const next = [...prev];
                                          next[i] = c;
                                          return next;
                                        })
                                      }
                                      ariaLabel={`Faction ${i + 1} color`}
                                    />
                                  </motion.div>
                                );
                              })}
                            </AnimatePresence>
                          </div>
                        </div>
                      </SectionCard>
                    )}

                    {mode !== 'age-of-strata' && (
                      <SectionCard
                        icon={Palette}
                        title="Players"
                        caption="Pick the banner colors for the two factions."
                        delay={0.14}
                        reducedMotion={reducedMotion}
                      >
                        <div
                          data-testid="faction-colors-row"
                          className="flex flex-wrap items-center gap-6 text-sm text-[var(--color-muted-hud)]"
                        >
                          <div className="flex items-center gap-2">
                            <Crown
                              className="h-4 w-4 text-[var(--color-gold-hud)]"
                              aria-hidden
                            />
                            <span className="w-14 text-sm text-[var(--color-text-hud)]">
                              Player
                            </span>
                            <FactionColorPicker
                              color={factionColors.player}
                              onChange={(c) =>
                                setFactionColors((prev) => ({ ...prev, player: c }))
                              }
                              ariaLabel="Player faction color"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Bot
                              className="h-4 w-4 text-[var(--color-danger-hud)]"
                              aria-hidden
                            />
                            <span className="w-14 text-sm text-[var(--color-text-hud)]">
                              Enemy
                            </span>
                            <FactionColorPicker
                              color={factionColors.enemy}
                              onChange={(c) =>
                                setFactionColors((prev) => ({ ...prev, enemy: c }))
                              }
                              ariaLabel="Enemy faction color"
                            />
                          </div>
                        </div>
                      </SectionCard>
                    )}
                  </div>
                </div>

                <footer className="sticky bottom-0 border-t border-[var(--color-border-hud)] bg-[var(--color-panel-solid)]/95 px-6 py-4 backdrop-blur">
                  <div className="mb-3 flex flex-wrap gap-1.5 text-[0.7rem] text-[var(--color-muted-hud)]">
                    {readout.map(({ label, icon: Icon }) => (
                      <span
                        key={label}
                        className="flex items-center gap-1 rounded-full border border-[var(--color-border-hud)] bg-black/30 px-2 py-0.5"
                      >
                        <Icon className="h-3 w-3" aria-hidden />
                        <span className="font-mono">{label}</span>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    id="begin-game"
                    onClick={handleBegin}
                    disabled={beginDisabled}
                    aria-disabled={beginDisabled}
                    className={cn(
                      'group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl px-6 py-4 font-display text-lg',
                      'border border-[#d4af37]/60 text-[#1a1208]',
                      'transition-all duration-150',
                      beginDisabled
                        ? 'cursor-not-allowed opacity-60'
                        : 'bg-gradient-to-b from-[#e8c660] via-[#d4af37] to-[#8b7124] shadow-[0_8px_32px_rgba(212,175,55,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(212,175,55,0.5),inset_0_1px_0_rgba(255,255,255,0.4)] active:translate-y-0 active:scale-[0.98]',
                    )}
                    style={{ fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}
                  >
                    <Swords className="h-5 w-5" aria-hidden />
                    <span className="relative z-10">Begin Match</span>
                  </button>
                </footer>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
