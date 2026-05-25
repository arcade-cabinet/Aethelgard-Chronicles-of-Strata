/**
 * M_V7.4X.SCORING — end-of-game scoring screen for 4X mode.
 *
 * Reads `game.victoryRecord` (set by detectVictory in
 * tickScoringPhase) and renders a Radix dialog with named outcome
 * + per-faction final stats + flavor text. Only renders when:
 *   (1) game.mode === 'age-of-strata' (the 4X mode), AND
 *   (2) game.victoryRecord !== null.
 *
 * Legacy 2-faction modes keep their existing GameOverModal flow
 * (Victory! / Defeat! titles + flavor) — this screen is the 4X
 * payoff per the v0.7 directive.
 */
import * as Dialog from '@radix-ui/react-dialog';
import { findFaction } from '@/config/factions';
import { FactionTrait, Building } from '@/ecs/components';
import { economyFor } from '@/game/economy-for';
import type { GameState } from '@/game/game-state';
import type { VictoryKind } from '@/game/victory-conditions';
import { formatInt, formatTime } from './format';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';

const KIND_FLAVOR: Record<VictoryKind, { title: string; flavor: string; tint: string }> = {
  military: {
    title: 'Military Victory',
    flavor: 'Their banners fall; the realm is yours by force of arms.',
    tint: '#ef4444',
  },
  economic: {
    title: 'Economic Victory',
    flavor: 'Coffers overflow + a Wonder stands. The age is yours by wealth.',
    tint: '#f59e0b',
  },
  scientific: {
    title: 'Scientific Victory',
    flavor: 'Discovery upon discovery. The age yields to your knowledge.',
    tint: '#22d3ee',
  },
  diplomatic: {
    title: 'Diplomatic Victory',
    flavor: 'Allies and tributaries answer to one banner. The age yields to your word.',
    tint: '#a855f7',
  },
};

function countBuildingsFor(game: GameState, faction: string): number {
  let n = 0;
  for (const e of game.world.query(Building, FactionTrait)) {
    const b = e.get(Building);
    const f = (e.get(FactionTrait)?.faction ?? 'player') as string;
    if (b?.isComplete && f === faction) n += 1;
  }
  return n;
}

export interface ScoringScreenProps {
  game: GameState;
}

export function ScoringScreen({ game }: ScoringScreenProps) {
  // Only render in 4X mode with a recorded victory.
  if (game.mode !== 'age-of-strata') return null;
  if (!game.victoryRecord) return null;

  const { kind, winner, detectedAtSeconds } = game.victoryRecord;
  const flavor = KIND_FLAVOR[kind];
  const winnerName = findFaction(game.factions, winner)?.displayName ?? winner;
  const winnerColor = findFaction(game.factions, winner)?.color ?? '#fff';

  // Build per-faction stats row.
  const factionStats = game.factions
    .filter((f) => f.kind !== 'barbarian')
    .map((f) => {
      const eco = economyFor(game, f.id);
      const buildings = countBuildingsFor(game, f.id);
      return {
        id: f.id,
        name: f.displayName,
        color: f.color,
        kills: eco.kills,
        buildings,
        score: eco.wood + eco.stone + eco.gold,
      };
    });

  return (
    <Dialog.Root open>
      <ModalShell
        contentId="scoring-screen"
        zIndex={1100}
        width="auto"
        maxHeight="none"
        blockClose
        contentStyle={{
          background: 'rgba(9,13,22,0.97)',
          borderRadius: 24,
          padding: 40,
          maxWidth: 520,
          fontFamily: HUD_THEME.font.body,
          color: '#fff',
        }}
      >
        <Dialog.Title
          data-testid="scoring-screen-title"
          style={{
            fontFamily: HUD_THEME.font.display,
            fontSize: '2.2rem',
            fontWeight: 800,
            margin: '0 0 8px',
            color: flavor.tint,
          }}
        >
          {flavor.title}
        </Dialog.Title>
        <div data-testid="scoring-screen-winner" style={{ fontSize: 16, marginBottom: 6 }}>
          Winner: <span style={{ color: winnerColor }}>{winnerName}</span>
        </div>
        <div style={{ color: HUD_THEME.color.muted, marginBottom: 16, fontSize: 13 }}>
          {flavor.flavor}
        </div>
        <div style={{ color: HUD_THEME.color.muted, marginBottom: 18, fontSize: 12 }}>
          Match length: {formatTime(detectedAtSeconds)}
        </div>

        {/* Per-faction stats table */}
        <div
          data-testid="scoring-screen-stats"
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          {factionStats.map((s) => (
            <div
              key={s.id}
              data-testid={`scoring-stats-${s.id}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '20px 1fr auto auto auto',
                gap: 12,
                alignItems: 'center',
                padding: '6px 8px',
                background: s.id === winner ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                borderRadius: 6,
                fontSize: 13,
              }}
            >
              <span
                aria-hidden
                style={{ width: 12, height: 12, borderRadius: 3, background: s.color }}
              />
              <span>{s.name}</span>
              <span style={{ color: HUD_THEME.color.muted }}>{formatInt(s.kills)} kills</span>
              <span style={{ color: HUD_THEME.color.muted }}>{formatInt(s.buildings)} bldg</span>
              <span>{formatInt(s.score)}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          data-testid="scoring-screen-restart"
          onClick={() => location.reload()}
          style={{
            marginTop: 24,
            padding: '12px 24px',
            borderRadius: 10,
            border: 'none',
            background: HUD_THEME.blueGradient,
            color: '#fff',
            fontFamily: HUD_THEME.font.display,
            fontSize: '1rem',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          New Match
        </button>
      </ModalShell>
    </Dialog.Root>
  );
}
