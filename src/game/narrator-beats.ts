/**
 * M_V11.OPEN.INACTIVITY + M_V11.NOTIF.ENEMY-AT-TH — narrator beat
 * emitters. Extracted from src/game/economy-tick-phases.ts to keep
 * that file under the 600-line code-quality threshold (CodeRabbit
 * PR #89). Each helper is called from tickClockPhase once per tick.
 */
import { hexDistance } from '@/core/hex';
import { FactionTrait, HexPosition, Unit } from '@/ecs/components';
import type { GameState } from './game-state';

/**
 * M_V11.OPEN.INACTIVITY — narrator beats fired when the player has
 * not queued a peon yet. The clock ticks even before the player
 * acts; without these beats the empty Town Hall could sit silently
 * for minutes and the player wouldn't know what's expected of
 * them. Each beat fires once per match (tracked via the
 * `inactivityBeatsFired` bitfield on GameState).
 *
 *   30s — info-tone: "Aethelgard awaits your first decree."
 *   90s — warning-tone: "Your realm cannot grow without peons."
 *
 * Reset condition: any peon entity exists for the player faction.
 * Skipping subsequent beats when the player has queued at least
 * one peon prevents the toast from harassing a player who simply
 * paused to think.
 */
export function tickInactivityBeats(game: GameState): void {
  if (typeof window === 'undefined') return;
  const elapsed = game.clock.elapsed;
  const fired = game.inactivityBeatsFired ?? 0;
  // No further work if both beats already fired.
  if ((fired & 0b11) === 0b11) return;
  // Has the player queued any peon? If so, no beat ever fires.
  for (const e of game.world.query(Unit, FactionTrait)) {
    if (e.get(FactionTrait)?.faction !== 'player') continue;
    if (e.get(Unit)?.unitType !== 'Peon') continue;
    // Lock in the 'both beats handled' state so we skip the
    // query on every tick going forward.
    game.inactivityBeatsFired = 0b11;
    return;
  }
  // Beat 1 — 30s.
  if (elapsed >= 30 && (fired & 0b01) === 0) {
    game.inactivityBeatsFired = fired | 0b01;
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: 'inactivity-beat-30s',
          tone: 'info',
          title: 'Aethelgard awaits your first decree',
          description: 'Tap your Town Hall and queue a Peon to begin.',
        },
      }),
    );
  }
  // Beat 2 — 90s.
  if (elapsed >= 90 && ((game.inactivityBeatsFired ?? 0) & 0b10) === 0) {
    game.inactivityBeatsFired = (game.inactivityBeatsFired ?? 0) | 0b10;
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: 'inactivity-beat-90s',
          tone: 'warning',
          title: 'Your realm cannot grow without peons',
          description: 'A Peon costs 30 wood. Queue one from the Town Hall.',
        },
      }),
    );
  }
}

/**
 * M_V11.NOTIF.ENEMY-AT-TH — fire a critical toast when an enemy
 * unit comes within 2 hex of the player's Town Hall. Tap-to-focus
 * goes to the Town Hall tile so the player can re-orient.
 *
 * Dedup: `inactivityBeatsFired` is reused with a higher bit
 * (0b100) to record "ENEMY-AT-TH already toasted this match." A
 * single toast per match keeps the warning meaningful — a player
 * who's been hearing the enemy approach for the past 60s doesn't
 * want a re-fire on every tick of new proximity.
 *
 * Tightened: only fires after the player has had at least 30s of
 * grace (the enemy can't be at the keep on tick 0 in the
 * classic-RTS opening anyway, but defensive).
 */
export function tickEnemyAtTownHallToast(game: GameState): void {
  if (typeof window === 'undefined') return;
  if (game.clock.elapsed < 30) return;
  const fired = game.inactivityBeatsFired ?? 0;
  if ((fired & 0b100) !== 0) return;
  const [tq, tr] = game.townHallKey.split(',').map(Number) as [number, number];
  for (const e of game.world.query(Unit, FactionTrait, HexPosition)) {
    const faction = e.get(FactionTrait)?.faction;
    if (faction !== 'enemy') continue;
    const pos = e.get(HexPosition);
    if (!pos) continue;
    if (hexDistance(tq, tr, pos.q, pos.r) > 2) continue;
    game.inactivityBeatsFired = fired | 0b100;
    window.dispatchEvent(
      new CustomEvent('aethelgard:toast', {
        detail: {
          id: 'enemy-at-th',
          tone: 'critical',
          title: 'Enemy at the gates',
          description: 'An enemy unit is closing on your Town Hall. Defend it now.',
          focus: { q: tq, r: tr },
        },
      }),
    );
    return;
  }
}
