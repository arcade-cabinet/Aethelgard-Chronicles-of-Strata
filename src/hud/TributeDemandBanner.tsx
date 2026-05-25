/**
 * M_V7.DIPLO.UI — auto-tribute demand banner.
 *
 * Scans every cross-faction pair each tick via canDemandTribute; for
 * any pair where the LOCAL faction is the WEAKER side AND a dominant
 * faction qualifies, shows a banner with Accept / Refuse buttons.
 *
 * Accept → acceptTribute (flips to tributary; 10% cession kicks in).
 * Refuse → refuseTribute (flips to enemy; wave-of-attack escalation hook).
 *
 * Only one banner shows at a time — the highest-ratio demand wins
 * (player can only address one demand per HUD frame; queuing UX is a
 * v0.8 polish item).
 */
import { useEffect, useState } from 'react';
import { findFaction } from '@/config/factions';
import { getRelation } from '@/game/diplomacy';
import { acceptTribute, canDemandTribute, refuseTribute } from '@/game/diplomacy-tribute';
import { economyFor } from '@/game/economy-for';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';

const LOCAL_FACTION = 'player';

export interface TributeDemandBannerProps {
  game: GameState;
  /** Polling cadence in ms; tests can override to 0. */
  pollIntervalMs?: number;
}

interface PendingDemand {
  demander: string;
}

function pickPendingDemand(game: GameState): PendingDemand | null {
  const localEco = economyFor(game, LOCAL_FACTION);
  // Iterate every non-barbarian faction; find one that's clearly
  // stronger than us AND not already in a relation that blocks tribute.
  for (const other of game.factions) {
    if (other.kind === 'barbarian') continue;
    if (other.id === LOCAL_FACTION) continue;
    const rel = getRelation(game.diplomacy, LOCAL_FACTION, other.id);
    if (rel === 'enemy' || rel === 'ally' || rel === 'tributary') continue;
    const otherEco = economyFor(game, other.id);
    if (!canDemandTribute(otherEco, localEco)) continue;
    return { demander: other.id };
  }
  return null;
}

export function TributeDemandBanner({ game, pollIntervalMs = 250 }: TributeDemandBannerProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (pollIntervalMs <= 0) return;
    const id = setInterval(() => setTick((t) => t + 1), pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs]);
  void tick;

  const pending = pickPendingDemand(game);
  if (!pending) return null;

  const demanderName =
    findFaction(game.factions, pending.demander)?.displayName ?? pending.demander;
  const demanderColor = findFaction(game.factions, pending.demander)?.color ?? '#ef4444';

  const onAccept = () => {
    acceptTribute(game.diplomacy, LOCAL_FACTION, pending.demander, game.clock.elapsed);
  };
  const onRefuse = () => {
    refuseTribute(game.diplomacy, LOCAL_FACTION, pending.demander, game.clock.elapsed);
  };

  return (
    <div
      data-testid="tribute-demand-banner"
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0) + 8px)',
        right: 'calc(env(safe-area-inset-right, 0) + 8px)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '10px 14px',
        background: 'rgba(15, 23, 42, 0.95)',
        border: `2px solid ${demanderColor}`,
        borderRadius: 10,
        color: '#fff',
        fontFamily: HUD_THEME.font.body,
        fontSize: 13,
        pointerEvents: 'auto',
        zIndex: 70,
        boxShadow: '0 8px 24px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden
          style={{ width: 10, height: 10, borderRadius: 3, background: demanderColor }}
        />
        <strong>{demanderName}</strong> demands tribute
      </div>
      <div style={{ color: HUD_THEME.color.muted, fontSize: 11 }}>
        Accept = 10% per-tick cession. Refuse = war.
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          data-testid="tribute-accept"
          onClick={onAccept}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(245, 158, 11, 0.85)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Accept
        </button>
        <button
          type="button"
          data-testid="tribute-refuse"
          onClick={onRefuse}
          style={{
            padding: '4px 10px',
            borderRadius: 6,
            background: 'rgba(239, 68, 68, 0.85)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Refuse
        </button>
      </div>
    </div>
  );
}
