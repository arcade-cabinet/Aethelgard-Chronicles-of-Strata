import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { doResearch } from '@/game/commands';
import { canAfford } from '@/game/economy';
import type { GameState } from '@/game/game-state';
import { canResearch, type ResearchId } from '@/game/research';
import { DISCOVERIES, scaledCostFor } from '@/rules';

// M_HUD.SHELL.17 / M_LORE.4 — Chronicler's-voice flavour per Discovery
// id, sourced from docs/lore/discoveries.md. Shown italic below the
// mechanical description so the panel reads like a tome of strata-
// answers rather than a tech-tree spreadsheet.
const DISCOVERY_FLAVOR: Record<string, string> = {
  forgedBlades: 'The Ember answered with an edge.',
  steelPlows: 'We asked the Verdant; it lent us the season.',
  'trade-route': 'The strata held the road through the winter; the wagons did not stray.',
  cartography: 'The Mythic showed us the realm whole, for one cold afternoon.',
  'iron-tools': 'The seam yielded; we shod our chisels in iron, and the mountain was kinder.',
  // M_V12.DEPTH.MILITARY-CHAIN — siege-engineering renamed
  // sapper-training (Siege I) when the chain expanded to 4 specs.
  'sapper-training':
    'We asked the wall its name; it answered; we wrote the answer on a stone, and the stone broke the wall.',
  'monumental-architecture':
    'The strata answered as one — yes, remember this. We laid the cornerstone before sunset.',
  // M_GAME.DISCOVERY.FORMATION.1+2 — Chronicler's voice for the 6
  // formation Discoveries, sourced from docs/lore/discoveries.md.
  // Gemini PR #65: prevents the panel from rendering a bare cost +
  // mechanical line for these entries.
  'formation-phalanx':
    'And when the spears were planted as one, the bronze beneath the realm shifted, and the line became wall.',
  'formation-cadre': 'The cadre is not three swords. It is one sword that wears three faces.',
  'formation-wedge':
    'The wedge does not arrive. The wedge is what was already there, only the enemy did not yet know.',
  'formation-skirmish-line':
    'The skirmish line is not a line of archers. It is the SHAPE the arrows make in flight.',
  'formation-square':
    'The square is the realm in miniature. It does not advance. It cannot retreat. It survives, and that is enough.',
  'formation-combined-arms':
    'And the Chronicler-King saw that the spear was not the answer, and the bow was not the answer, and the wedge was not the answer. The answer was all three, spoken in the same breath.',
};
import { costLabel } from './format';
import { emitToast } from './Toasts';
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
  // M_EXPANSION.U.124 — search filter (case-insensitive substring on
  // name OR description; empty = show all).
  const [filter, setFilter] = useState('');
  const eco = game.economy.player;
  // M_HUD.SHELL.1 — replace the inline HudPill trigger with a CustomEvent
  // listener so SystemMenu (the universal top-right hamburger) owns the
  // open trigger. The panel itself stays an internally-stateful Radix
  // Dialog; only the trigger surface moves.
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('aethelgard:open-discoveries', onOpen);
    return () => window.removeEventListener('aethelgard:open-discoveries', onOpen);
  }, []);
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
        {/* M_EXPANSION.U.124 — search filter. Hidden until the
            registry grows past 6 rows so a small library doesn't
            need the chrome. */}
        {DISCOVERIES.length > 6 && (
          <input
            id="discoveries-filter"
            type="text"
            value={filter}
            placeholder="Filter discoveries…"
            onChange={(e) => setFilter(e.target.value)}
            aria-label="Filter discoveries"
            style={{
              width: '100%',
              padding: '6px 10px',
              borderRadius: 8,
              border: `1px solid ${HUD_THEME.color.border}`,
              background: 'rgba(9,13,22,0.7)',
              color: HUD_THEME.color.text,
              fontFamily: HUD_THEME.font.body,
              fontSize: '0.82rem',
              margin: '0 0 12px',
              boxSizing: 'border-box',
            }}
          />
        )}
        {DISCOVERIES.filter((d) => {
          const q = filter.trim().toLowerCase();
          if (!q) return true;
          return d.name.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
        }).map((d) => {
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
                {DISCOVERY_FLAVOR[d.id] && (
                  <div
                    data-testid={`discovery-flavor-${d.id}`}
                    style={{
                      fontSize: '0.74rem',
                      fontStyle: 'italic',
                      color: HUD_THEME.color.gold,
                      marginTop: 4,
                      opacity: 0.85,
                      lineHeight: 1.4,
                    }}
                  >
                    “{DISCOVERY_FLAVOR[d.id]}”
                  </div>
                )}
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
                onClick={() => {
                  const ok = doResearch(game, d.id as ResearchId);
                  if (ok) {
                    emitToast({
                      id: `discovery-${d.id}`,
                      tone: 'success',
                      title: 'Discovery unlocked',
                      description: d.name,
                    });
                  }
                }}
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
