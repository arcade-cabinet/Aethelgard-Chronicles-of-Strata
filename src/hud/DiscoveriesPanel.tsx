import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { doResearch } from '@/game/commands';
import { canAfford } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { canResearch, type ResearchId } from '@/game/research';
import { useViewport } from '@/render/useViewport';
import { DISCOVERIES } from '@/rules';
import { costLabel } from './format';
import { HUD_THEME } from './hud-theme';

/**
 * Discoveries panel (M_DATA.7). A top-right button opens a Radix Dialog
 * listing every Discovery row from `discoveries.json`: name, description,
 * cost, status (purchased / prereqs unmet / unaffordable / available).
 * Each row is text-only (no per-Discovery faceplate, per user direction —
 * compresses cleanly as the tree grows).
 *
 * Driven entirely from the typed registry — adding a Discovery JSON row
 * adds a panel row, no JSX change.
 */
export function DiscoveriesPanel({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  const eco = game.economy.player;
  const viewport = useViewport();
  // narrow phones stack the trigger button below the pause/sound buttons
  const rightPx = viewport.isPortrait ? 8 : 340;
  const topPx = viewport.isPortrait ? 52 : 12;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          id="discoveries-button"
          data-hud-panel
          type="button"
          style={{
            position: 'absolute',
            top: topPx,
            right: rightPx,
            zIndex: 6,
            padding: '6px 14px',
            borderRadius: 999,
            background: HUD_THEME.color.panel,
            color: HUD_THEME.color.accent,
            border: `1px solid ${HUD_THEME.color.border}`,
            fontFamily: HUD_THEME.font.body,
            fontSize: '0.78rem',
            fontWeight: 700,
            cursor: 'pointer',
            pointerEvents: 'auto',
          }}
        >
          ⚗ Discoveries
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{ position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.7)', zIndex: 100 }}
        />
        <Dialog.Content
          id="discoveries-panel"
          aria-describedby={undefined}
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(520px, 90vw)',
            maxHeight: '80vh',
            overflow: 'auto',
            background: HUD_THEME.color.panel,
            border: `2px solid ${HUD_THEME.color.border}`,
            borderRadius: 14,
            padding: 24,
            color: HUD_THEME.color.text,
            fontFamily: HUD_THEME.font.body,
            zIndex: 101,
          }}
        >
          <Dialog.Title
            style={{
              fontFamily: HUD_THEME.font.display,
              fontSize: '1.5rem',
              color: HUD_THEME.color.gold,
              margin: '0 0 14px',
            }}
          >
            Discoveries
          </Dialog.Title>
          {DISCOVERIES.map((d) => {
            const purchased = game.research.purchased.has(d.id as ResearchId);
            const prereqMet = (d.prereqs ?? []).every((p) =>
              game.research.purchased.has(p as ResearchId),
            );
            const affordable = canAfford(eco, d.cost);
            const available = !purchased && prereqMet && affordable;
            const status = purchased
              ? 'Purchased'
              : !prereqMet
                ? 'Prereqs needed'
                : !affordable
                  ? 'Unaffordable'
                  : 'Available';
            return (
              <div
                key={d.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ flex: 1, marginRight: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.92rem' }}>{d.name}</div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: HUD_THEME.color.muted,
                      marginTop: 2,
                      lineHeight: 1.4,
                    }}
                  >
                    {d.description}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: HUD_THEME.color.accent,
                      marginTop: 4,
                    }}
                  >
                    Cost: {costLabel(d.cost)} · {status}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={!available}
                  onClick={() => doResearch(game, d.id as ResearchId)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: available ? HUD_THEME.blueGradient : 'rgba(255,255,255,0.06)',
                    color: available ? '#fff' : HUD_THEME.color.muted,
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: available ? 'pointer' : 'default',
                    minWidth: 86,
                  }}
                >
                  {purchased ? '✓' : 'Buy'}
                </button>
              </div>
            );
          })}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// canResearch is reserved for AI-side gating + a future per-row icon; ensure
// the symbol stays imported so wiring it next is a one-line edit.
void canResearch;
