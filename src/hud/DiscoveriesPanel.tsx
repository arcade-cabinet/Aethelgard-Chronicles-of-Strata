import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { doResearch } from '@/game/commands';
import { canAfford } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { canResearch, type ResearchId } from '@/game/research';
import { DISCOVERIES, scaledCostFor } from '@/rules';
import { costLabel } from './format';
import { HudPill } from './HudPill';
import { HUD_THEME } from './hud-theme';
import { ModalShell } from './ModalShell';

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
  // M_EXPANSION.AU.40 — overlay map-of-realms ambient while the
  // panel is open. The ambient slot is single — this takes
  // precedence over the crafting-hall ambient while the panel is up.
  // On close, useAudio's next frame restores crafting-hall if
  // build sites are still active.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([import('@/audio/buses'), import('@/audio/ui-sound-emitter')]).then(
      ([buses, emitter]) => {
        if (cancelled) return;
        const b = emitter.getRegisteredBuses();
        if (b) buses.startAmbient(b, 'audio.music.biome.map-of-realms');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open]);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {/* M_MICRO.10.2 — HudPill picks (top, right) from its slot table. */}
        <HudPill slot="discoveries" id="discoveries-button">
          ⚗ Discoveries
        </HudPill>
      </Dialog.Trigger>
      {/* M_MICRO.10.1 — ModalShell collapses the per-dialog Overlay +
          Content styling. Only DiscoveriesPanel-specific overrides
          (font-family) come through contentStyle. */}
      <ModalShell contentId="discoveries-panel" contentStyle={{ fontFamily: HUD_THEME.font.body }}>
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
          // M_FEATURE.2 — purchase cost scales with depth in the prereq DAG.
          const effectiveCost = scaledCostFor(d.id);
          const affordable = canAfford(eco, effectiveCost);
          // M_AUDIT2.ARCH.19 — `canResearch` is now the single source of
          // truth for "is this row purchasable" (was a `void canResearch`
          // shim). Drives the disabled state below; prereqMet+affordable
          // are kept locally for the per-row status string formatting.
          const available = canResearch(eco, game.research, d.id as ResearchId);
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
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontWeight: 700,
                    fontSize: '0.92rem',
                  }}
                >
                  {/* M_AUDIT2.UX.17 — status pip: green=purchased,
                      amber=available, gray=gated, red=unaffordable. */}
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 8,
                      background: purchased
                        ? '#10b981'
                        : !prereqMet
                          ? '#64748b'
                          : !affordable
                            ? '#ef4444'
                            : '#f59e0b',
                    }}
                  />
                  {d.name}
                </div>
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: HUD_THEME.color.muted,
                    marginTop: 2,
                    lineHeight: 1.4,
                  }}
                >
                  {d.description}
                </div>
                {/* M_AUDIT2.UX.17 — prereq tree row. Lists each prereq
                    with its own status (✓ met, ✗ missing) so the
                    player sees the dependency at a glance. Empty for
                    root Discoveries. */}
                {(d.prereqs ?? []).length > 0 && (
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: HUD_THEME.color.muted,
                      marginTop: 4,
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6,
                    }}
                  >
                    <span>Requires:</span>
                    {(d.prereqs ?? []).map((p) => {
                      const ok = game.research.purchased.has(p as ResearchId);
                      const prereqName = DISCOVERIES.find((x) => x.id === p)?.name ?? p;
                      return (
                        <span
                          key={p}
                          style={{
                            color: ok ? '#10b981' : '#ef4444',
                            fontWeight: 700,
                          }}
                        >
                          {ok ? '✓' : '✗'} {prereqName}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '0.78rem',
                    color: HUD_THEME.color.accent,
                    marginTop: 4,
                  }}
                >
                  Cost: {costLabel(effectiveCost)} · {status}
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
      </ModalShell>
    </Dialog.Root>
  );
}
