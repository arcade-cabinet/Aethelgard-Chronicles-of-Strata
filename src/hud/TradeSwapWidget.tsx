/**
 * M_V7.DIPLO.UI — trade-swap widget.
 *
 * Surfaces the v0.6 `performTrade` primitive as a clickable form.
 * Two resource pickers (give / receive) + amount inputs; submit
 * calls performTrade and shows the result. Inline (no Radix dialog
 * dependency — keeps the bundle small; parents control opening via
 * conditional render of this component).
 *
 * Trade gate (`trade-route` Discovery + isTradeAvailable) is checked
 * before each submit; the form disables submit + shows the reason
 * when unavailable.
 */
import { useState } from 'react';
import { findFaction } from '@/config/factions';
import { isTradeAvailable, performTrade, TRADE_ROUTE_DISCOVERY_ID } from '@/game/diplomacy-trade';
import { economyFor } from '@/game/economy-for';
import type { GameState } from '@/game/game-state';
import { HUD_THEME } from './hud-theme';

const LOCAL_FACTION = 'player';

export interface TradeSwapWidgetProps {
  game: GameState;
  /** Faction id to trade with. */
  counterparty: string;
  /** Called when the trade succeeds (parent typically closes the widget). */
  onSuccess?: () => void;
  /** Called when the user cancels. */
  onCancel?: () => void;
}

const RESOURCES = ['wood', 'stone', 'gold'] as const;

export function TradeSwapWidget({ game, counterparty, onSuccess, onCancel }: TradeSwapWidgetProps) {
  const [giveResource, setGiveResource] = useState<(typeof RESOURCES)[number]>('wood');
  const [receiveResource, setReceiveResource] = useState<(typeof RESOURCES)[number]>('stone');
  const [giveAmount, setGiveAmount] = useState(10);
  const [receiveAmount, setReceiveAmount] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const counterpartyName = findFaction(game.factions, counterparty)?.displayName ?? counterparty;
  const counterpartyColor = findFaction(game.factions, counterparty)?.color ?? '#94a3b8';

  // Gate the submit button on:
  // (1) trade-route Discovery purchased,
  // (2) isTradeAvailable (not same-id / not enemy / cooldown clear).
  const hasTradeRoute = game.research.purchased.has(TRADE_ROUTE_DISCOVERY_ID as never);
  const tradeAvailable = isTradeAvailable(
    game.tradeCooldowns,
    game.diplomacy,
    LOCAL_FACTION,
    counterparty,
    game.clock.elapsed,
  );
  const submitDisabled = !hasTradeRoute || !tradeAvailable;

  const onSubmit = () => {
    setError(null);
    const ok = performTrade(
      game.tradeCooldowns,
      game.diplomacy,
      LOCAL_FACTION,
      counterparty,
      giveResource,
      giveAmount,
      receiveResource,
      receiveAmount,
      game.clock.elapsed,
      (f) => economyFor(game, f),
    );
    if (ok) {
      onSuccess?.();
    } else {
      setError('Trade rejected: insufficient resources or gated.');
    }
  };

  return (
    <div
      data-testid="trade-swap-widget"
      style={{
        background: 'rgba(15, 23, 42, 0.96)',
        border: `1px solid ${counterpartyColor}`,
        borderRadius: 10,
        padding: 16,
        color: '#fff',
        fontFamily: HUD_THEME.font.body,
        fontSize: 13,
        minWidth: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{ fontFamily: HUD_THEME.font.display, fontSize: 16 }}>
        Trade with <span style={{ color: counterpartyColor }}>{counterpartyName}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Give</span>
        <input
          type="number"
          data-testid="trade-give-amount"
          min={1}
          max={9999}
          value={giveAmount}
          onChange={(e) => setGiveAmount(Math.max(1, Number(e.target.value) || 0))}
          style={{
            width: 64,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
          }}
        />
        <select
          data-testid="trade-give-resource"
          value={giveResource}
          onChange={(e) => setGiveResource(e.target.value as (typeof RESOURCES)[number])}
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
          }}
        >
          {RESOURCES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>Receive</span>
        <input
          type="number"
          data-testid="trade-receive-amount"
          min={1}
          max={9999}
          value={receiveAmount}
          onChange={(e) => setReceiveAmount(Math.max(1, Number(e.target.value) || 0))}
          style={{
            width: 64,
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
          }}
        />
        <select
          data-testid="trade-receive-resource"
          value={receiveResource}
          onChange={(e) => setReceiveResource(e.target.value as (typeof RESOURCES)[number])}
          style={{
            padding: '2px 6px',
            borderRadius: 4,
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            color: '#fff',
          }}
        >
          {RESOURCES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {!hasTradeRoute && (
        <div style={{ color: '#fbbf24', fontSize: 12 }} data-testid="trade-no-discovery-warning">
          Requires the Trade Route Discovery.
        </div>
      )}
      {error && (
        <div style={{ color: '#ef4444', fontSize: 12 }} data-testid="trade-error">
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          type="button"
          data-testid="trade-cancel"
          onClick={onCancel}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: 'rgba(100, 116, 139, 0.85)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          data-testid="trade-submit"
          onClick={onSubmit}
          disabled={submitDisabled}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            background: submitDisabled ? 'rgba(100, 116, 139, 0.4)' : 'rgba(34, 197, 94, 0.85)',
            border: 'none',
            color: '#fff',
            cursor: submitDisabled ? 'not-allowed' : 'pointer',
            opacity: submitDisabled ? 0.6 : 1,
          }}
        >
          Trade
        </button>
      </div>
    </div>
  );
}
