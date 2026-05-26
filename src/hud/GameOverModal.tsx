/**
 * GameOverModal — cinematic terminal-state screen (M_HUD.SHELL.5).
 *
 * Win → gold "Victory!" with Trophy hero. Loss → crimson "Defeat!" with
 * Skull hero. Draw → accent "Draw!" with Scale hero. Each reveals:
 * match nickname + highlights, mode-specific narrative (long-reign),
 * per-faction grid (N-player) OR legacy 2-faction stat list, and a
 * gold-gradient "Re-enter Aethelgard" CTA.
 *
 * Preserved verbatim from the prior implementation: the polling +
 * setInterval + aethelgard:outcome-changed CustomEvent flip detection,
 * the lorebook write with exponential backoff + cross-mount guard, the
 * persistence prop, the `modal-title-win/loss/draw` classes, the
 * `#nplayer-faction-grid`, `#long-reign-narrative`, `.nplayer-winner-row`,
 * `.relation-badge.relation-{rel}`, `.tribute-ally-tag` test contracts,
 * and the `data-faction-id` + `data-relation` attributes.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { RotateCcw, Scale as ScaleIcon, Skull, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { factionIds } from '@/config/factions';
import { Building, FactionTrait } from '@/ecs/components';
import type { GameOutcome } from '@/ecs/systems/win-loss';
import { getRelation } from '@/game/diplomacy';
import { economyFor } from '@/game/economy-for';
import type { GameState } from '@/game/game-state';
import { detectTranscriptHighlights, matchHighlights, matchNickname } from '@/game/match-narrative';
import { cn } from '@/lib/cn';
import type { Persistence } from '@/persistence/persistence';
import { formatInt, formatTime } from './format';
import { MatchSummaryCard } from './MatchSummaryCard';
import { Halo, TreasureButton } from './primitives';

interface StatLine {
  label: string;
  value: string;
}

export interface GameOverModalProps {
  game: GameState;
  /** When supplied, the modal writes one lorebook entry per terminal flip. */
  persistence?: Persistence;
}

export function GameOverModal({ game, persistence }: GameOverModalProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [outcome, setOutcome] = useState<GameOutcome>(game.outcome);
  const lorebookWrittenRef = useRef(false);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setOutcome(game.outcome);
      if (game.outcome === 'playing') raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const interval = window.setInterval(() => {
      if (game.outcome !== 'playing') {
        setOutcome(game.outcome);
        window.clearInterval(interval);
      }
    }, 100);
    const onOutcomeChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ outcome: GameOutcome }>).detail;
      const next = detail?.outcome ?? game.outcome;
      setOutcome(next);
    };
    window.addEventListener('aethelgard:outcome-changed', onOutcomeChanged);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(interval);
      window.removeEventListener('aethelgard:outcome-changed', onOutcomeChanged);
    };
  }, [game]);

  // Lorebook write w/ exponential backoff. `game` deliberately omitted
  // from deps — the closure captures once at firing time.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above.
  useEffect(() => {
    if (outcome === 'playing' || !persistence) return;
    if (lorebookWrittenRef.current) return;
    lorebookWrittenRef.current = true;
    void (async () => {
      const entry = {
        id: 0,
        endedAt: new Date().toISOString(),
        seedPhrase: game.seedPhrase,
        nickname: matchNickname({ seedPhrase: game.seedPhrase, outcome }),
        outcome,
        mode: game.mode,
        enemyPersonality: game.aiPlayers.enemy?.personalityKey ?? null,
        highlights: matchHighlights(game),
      };
      const MAX_ATTEMPTS = 3;
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          await persistence.recordLorebookEntry(entry);
          return;
        } catch (err) {
          const isLast = attempt === MAX_ATTEMPTS - 1;
          if (isLast) {
            lorebookWrittenRef.current = false;
            console.warn(`[lorebook] record failed after ${MAX_ATTEMPTS} attempts:`, err);
          } else {
            await new Promise<void>((res) => setTimeout(res, 200 * 2 ** attempt));
          }
        }
      }
    })();
  }, [outcome, persistence]);

  const isWin = outcome === 'win';
  const isDraw = outcome === 'draw';
  const HeroIcon = isWin ? Trophy : isDraw ? ScaleIcon : Skull;
  const titleText = isWin ? 'Victory!' : isDraw ? 'Draw!' : 'Defeat!';
  const titleClass = isWin ? 'modal-title-win' : isDraw ? 'modal-title-draw' : 'modal-title-loss';
  const titleGradient = isWin
    ? 'var(--gradient-victory-title)'
    : isDraw
      ? 'var(--gradient-draw-title)'
      : 'var(--gradient-defeat-title)';
  // <Halo> primitive picks the radial gradient by tone; we still need
  // a CSS color literal for the title drop-shadow (filter: drop-shadow
  // can't read a CSS gradient var).
  const haloShadow = isWin
    ? 'rgba(212,175,55,0.35)'
    : isDraw
      ? 'rgba(56,189,248,0.30)'
      : 'rgba(239,68,68,0.30)';
  const flavorText = isWin
    ? 'You have razed the enemy base and defended Aethelgard.'
    : isDraw
      ? 'The realms reach equilibrium. The clock runs out with neither side prevailing.'
      : 'The enemy razed your home base. Aethelgard has fallen.';

  // Legacy 2-faction stats.
  const playerScore = Math.round(game.score.player);
  const enemyScore = Math.round(game.score.enemy);
  let playerBuildings = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    if (e.get(Building)?.isComplete && e.get(FactionTrait)?.faction === 'player') {
      playerBuildings += 1;
    }
  }
  const stats: StatLine[] = [
    { label: 'Gold Earned', value: formatInt(game.economy.player.gold) },
    { label: 'Lumber Harvested', value: formatInt(game.economy.player.wood) },
    { label: 'Enemies Vanquished', value: formatInt(game.economy.player.kills) },
    { label: 'Buildings Standing', value: formatInt(playerBuildings) },
    {
      label: 'Peak Supply',
      value: `${formatInt(game.economy.player.peakSupply)} / ${formatInt(game.economy.player.maxSupply)}`,
    },
    { label: 'Time Elapsed', value: formatTime(game.clock.elapsed) },
    { label: 'Territory Score', value: `${playerScore} vs ${enemyScore}` },
  ];

  // N-player per-faction grid.
  const nonBarbarianFactions = game.factions.filter((f) => f.kind !== 'barbarian');
  const isNPlayer = nonBarbarianFactions.length > 2;
  const winnerId = game.victoryRecord?.winner ?? null;

  interface FactionRow {
    id: string;
    displayName: string;
    kills: number;
    score: number;
    relation: string;
    isTributaryWinner: boolean;
    isWinner: boolean;
  }

  const factionRows: FactionRow[] = isNPlayer
    ? factionIds(nonBarbarianFactions).map((fid) => {
        const eco = economyFor(game, fid);
        const score =
          fid === 'player' || fid === 'enemy'
            ? Math.round((game.score as Record<string, number>)[fid] ?? 0)
            : 0;
        const refId = winnerId ?? 'player';
        const rel = fid === refId ? 'winner' : getRelation(game.diplomacy, fid, refId);
        const isTributaryWinner = rel === 'tributary' && winnerId !== null && fid !== winnerId;
        return {
          id: fid,
          displayName: nonBarbarianFactions.find((f) => f.id === fid)?.displayName ?? fid,
          kills: eco.kills,
          score,
          relation: rel,
          isTributaryWinner,
          isWinner: fid === winnerId,
        };
      })
    : [];

  return (
    <Dialog.Root open={outcome !== 'playing'}>
      <AnimatePresence>
        {outcome !== 'playing' && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.32 }}
                className="fixed inset-0 bg-[rgba(9,13,22,0.92)] backdrop-blur-md"
                style={{ zIndex: 1000 }}
              />
            </Dialog.Overlay>
            <Dialog.Content
              asChild
              onEscapeKeyDown={(e) => e.preventDefault()}
              onPointerDownOutside={(e) => e.preventDefault()}
              onInteractOutside={(e) => e.preventDefault()}
            >
              <motion.div
                id="game-over-modal"
                initial={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
                  'w-[min(560px,calc(100vw-32px))] max-h-[min(90dvh,820px)] overflow-y-auto',
                  'rounded-3xl border bg-[var(--color-surface-solid)] text-[var(--color-on-surface)]',
                  'border-[var(--color-border)] shadow-2xl',
                )}
                style={{ zIndex: 1001, fontFamily: 'var(--font-body)' }}
              >
                {/* Hero zone: pulsing halo + giant icon + outcome title. */}
                <div className="relative flex flex-col items-center pb-4 pt-10">
                  <Halo tone={isWin ? 'treasure' : isDraw ? 'accent' : 'danger'} />
                  <div
                    className={cn(
                      'relative z-10 flex h-20 w-20 items-center justify-center rounded-full border-2 bg-black/40',
                      isWin && 'border-[var(--color-treasure)]/70',
                      isDraw && 'border-[var(--color-accent)]/70',
                      !isWin && !isDraw && 'border-[var(--color-danger)]/70',
                    )}
                  >
                    <HeroIcon
                      className={cn(
                        'h-10 w-10',
                        isWin && 'text-[var(--color-treasure)]',
                        isDraw && 'text-[var(--color-accent)]',
                        !isWin && !isDraw && 'text-[var(--color-danger)]',
                      )}
                      aria-hidden
                    />
                  </div>
                  <Dialog.Title
                    className={cn(
                      titleClass,
                      'mt-5 text-center font-display text-5xl font-extrabold tracking-[0.04em]',
                    )}
                    style={{
                      fontFamily: 'var(--font-display)',
                      backgroundImage: titleGradient,
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      color: 'transparent',
                      filter: `drop-shadow(0 8px 24px ${haloShadow})`,
                    }}
                  >
                    {titleText}
                  </Dialog.Title>
                  <Dialog.Description className="mt-3 max-w-[44ch] px-6 text-center text-sm italic text-[var(--color-on-surface-muted)]">
                    {flavorText}
                  </Dialog.Description>
                </div>

                <div className="space-y-5 px-7 pb-7">
                  <MatchSummaryCard
                    nickname={matchNickname({ seedPhrase: game.seedPhrase, outcome })}
                    highlights={(() => {
                      const beats = detectTranscriptHighlights(game).map((b) => b.detail);
                      return beats.length > 0 ? beats : matchHighlights(game);
                    })()}
                  />

                  {game.mode === 'long-reign' && (
                    <div
                      id="long-reign-narrative"
                      className="rounded-xl border border-[var(--color-border)] bg-[rgba(56,189,248,0.08)] px-4 py-3 text-center text-sm text-[var(--color-treasure)]"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      👑 Survived {formatTime(game.clock.elapsed)} — Endured{' '}
                      {formatInt(game.randomEvents.fired ?? 0)} escalation
                      {(game.randomEvents.fired ?? 0) === 1 ? '' : 's'} — Built{' '}
                      {formatInt(playerBuildings)} structure
                      {playerBuildings === 1 ? '' : 's'}
                    </div>
                  )}

                  {isNPlayer && factionRows.length > 0 && (
                    <div
                      id="nplayer-faction-grid"
                      className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/30 text-left"
                    >
                      <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-3 border-b border-white/10 px-4 py-2 text-[0.72rem] uppercase tracking-[0.18em] text-[var(--color-on-surface-muted)]">
                        <span>Faction</span>
                        <span>Kills</span>
                        <span>Score</span>
                        <span>Relation</span>
                        <span>Status</span>
                      </div>
                      <div>
                        {factionRows.map((row) => (
                          <div
                            key={row.id}
                            className={cn(
                              'grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-x-3 border-b border-white/5 px-4 py-2 text-sm',
                              row.isWinner && 'nplayer-winner-row bg-[rgba(212,175,55,0.08)]',
                            )}
                            data-faction-id={row.id}
                            data-relation={row.relation}
                          >
                            <span
                              className={cn(
                                row.isWinner
                                  ? 'font-semibold text-[var(--color-treasure)]'
                                  : 'text-[var(--color-on-surface)]',
                              )}
                            >
                              {row.displayName}
                            </span>
                            <span className="text-[var(--color-accent)]">
                              {formatInt(row.kills)}
                            </span>
                            <span className="text-[var(--color-accent)]">
                              {formatInt(row.score)}
                            </span>
                            <span
                              className={cn(
                                'relation-badge',
                                `relation-${row.relation}`,
                                row.relation === 'ally' && 'text-[var(--color-accent)]',
                                row.relation === 'enemy' && 'text-[var(--color-danger)]',
                                row.relation === 'tributary' && 'text-[var(--color-treasure)]',
                                (row.relation === 'neutral' || row.relation === 'winner') &&
                                  'text-[var(--color-on-surface-muted)]',
                              )}
                            >
                              {row.relation === 'winner' ? '—' : row.relation}
                            </span>
                            <span className="text-right">
                              {row.isWinner && (
                                <span className="winner-badge text-[var(--color-treasure)]">★</span>
                              )}
                              {row.isTributaryWinner && (
                                <span className="tribute-ally-tag text-[var(--color-treasure)]">
                                  ally
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {!isNPlayer && (
                    <ul className="divide-y divide-white/10 overflow-hidden rounded-xl border border-[var(--color-border)] bg-black/20">
                      {stats.map((s) => (
                        <li
                          key={s.label}
                          className="flex items-center justify-between px-4 py-2.5 text-sm"
                        >
                          <span className="text-[var(--color-on-surface-muted)]">{s.label}</span>
                          <span className="font-semibold text-[var(--color-accent)]">
                            {s.value}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <TreasureButton
                    aria-label="Reload the page to start a new game"
                    onClick={() => location.reload()}
                    icon={<RotateCcw className="h-4 w-4" aria-hidden />}
                    className="mx-auto mt-2 w-full max-w-xs"
                  >
                    Re-enter Aethelgard
                  </TreasureButton>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
