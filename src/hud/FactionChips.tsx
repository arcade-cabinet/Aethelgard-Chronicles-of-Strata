/**
 * M_V6.CARRY.HUD-N-BANNERS — render one banner chip per non-barbarian
 * faction in `game.factions`.
 *
 * v0.5 ships the registry; this component is the HUD surface that
 * actually paints all N banners. For the legacy 2-faction case (N <= 2)
 * the strip is hidden — the existing player + enemy HUD chips already
 * own that screen real estate. For 3+ player matches (4X / FFA), the
 * strip appears at the top-center showing every player faction's
 * displayName + color swatch + a live kill counter (when the legacy
 * Record<Faction, GameEconomy> carries one).
 *
 * Barbarian camps are intentionally NOT rendered as chips — they're
 * neutral aggressors, not opponents on the score board.
 */
import { findFaction, type FactionConfig } from '@/config/factions';
import type { GameState } from '@/game/game-state';
import { formatInt } from './format';
import { HUD_THEME } from './hud-theme';

export interface FactionChipsProps {
  game: GameState;
}

/** Convert a faction config to a HUD chip row. */
function chipFor(
  game: GameState,
  f: FactionConfig,
): {
  id: string;
  name: string;
  color: string;
  killCount: number | null;
} {
  // GameEconomy is keyed by legacy Faction union; only player + enemy
  // have economy entries today. For N-player slots (player-3..N), the
  // chip still renders with name + color — kill count is null until
  // M_PIVOT.N-PLAYER.FACTIONS-V2 migrates economy to a registry-keyed
  // map. Renderer reads `f.color` directly from the registry config.
  const eco = (game.economy as unknown as Record<string, { kills?: number } | undefined>)[f.id];
  return {
    id: f.id,
    name: f.displayName,
    color: f.color,
    killCount: eco?.kills ?? null,
  };
}

export function FactionChips({ game }: FactionChipsProps) {
  // Filter to NON-barbarian factions (camps are aggressors, not opponents).
  const playerFactions = game.factions.filter((f) => f.kind !== 'barbarian');
  // Legacy 2-faction case keeps its existing player+enemy HUD chips —
  // hide this strip to avoid duplication.
  if (playerFactions.length <= 2) return null;

  const chips = playerFactions.map((f) => chipFor(game, f));

  return (
    <div
      data-testid="faction-chips-strip"
      style={{
        position: 'absolute',
        top: 'calc(env(safe-area-inset-top, 0) + 8px)',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        pointerEvents: 'none',
        zIndex: 50,
      }}
    >
      {chips.map((chip) => (
        <div
          key={chip.id}
          data-testid={`faction-chip-${chip.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(15, 23, 42, 0.85)',
            border: `1px solid ${chip.color}`,
            color: '#fff',
            fontFamily: HUD_THEME.font.body,
            fontSize: 12,
            lineHeight: 1.2,
          }}
        >
          <span
            data-testid={`faction-chip-swatch-${chip.id}`}
            style={{
              width: 10,
              height: 10,
              borderRadius: 3,
              background: chip.color,
              flexShrink: 0,
            }}
            aria-hidden
          />
          <span>{chip.name}</span>
          {chip.killCount !== null && (
            <span style={{ color: HUD_THEME.color.muted, marginLeft: 4 }}>
              {formatInt(chip.killCount)}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Helper: return the names + colors of the visible faction chips. Used
 * by tests + downstream wiring. Falls back to LEGACY_FACTIONS lookup
 * when registry is absent.
 */
export function describeFactionChips(
  game: GameState,
): Array<{ id: string; name: string; color: string }> {
  return game.factions
    .filter((f) => f.kind !== 'barbarian')
    .map((f) => {
      const reg = findFaction(game.factions, f.id);
      return {
        id: f.id,
        name: reg?.displayName ?? f.displayName,
        color: reg?.color ?? f.color,
      };
    });
}
