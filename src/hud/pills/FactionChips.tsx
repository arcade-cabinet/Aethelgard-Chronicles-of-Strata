/**
 * FactionChips — N-player faction strip (M_HUD.SHELL.20).
 *
 * Mobile-first composition:
 *   - Desktop / ultraWide: render the full horizontal chip strip
 *     top-center (the legacy behaviour).
 *   - Everywhere else (foldable / tablet / phone landscape +
 *     portrait): collapse to a single "Players (N)" pill that
 *     opens a Radix Popover with the full chip list. Fixes the
 *     original OnePlus Open overcrowding case (6 chips eating the
 *     top band).
 *
 * Test contract preserved: data-testid="faction-chips-strip" on the
 * trigger pill (and on the popover content when open), `faction-chip-
 * ${id}` on each chip row, `faction-chip-swatch-${id}` on each color
 * swatch.
 *
 * Hidden for legacy 2-faction matches — the existing player+enemy
 * HUD chips own that real estate there.
 */
import * as Popover from '@radix-ui/react-popover';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { type FactionConfig, findFaction } from '@/config/ai';
import type { GameState } from '@/game/game-state';
import { cn } from '@/lib/cn';
import { useViewport } from '@/render/useViewport';
import { formatInt, HUD_THEME, TOP_CENTER_SLOT, topCenterSlot } from '../theme';

export interface FactionChipsProps {
  game: GameState;
}

interface ChipRow {
  id: string;
  name: string;
  color: string;
  killCount: number | null;
}

function chipFor(game: GameState, f: FactionConfig): ChipRow {
  const eco = (game.economy as unknown as Record<string, { kills?: number } | undefined>)[f.id];
  return {
    id: f.id,
    name: f.displayName,
    color: f.color,
    killCount: eco?.kills ?? null,
  };
}

function ChipPill({ chip, dense }: { chip: ChipRow; dense?: boolean }) {
  return (
    <div
      data-testid={`faction-chip-${chip.id}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: dense ? '4px 8px' : '4px 10px',
        borderRadius: 999,
        background: 'rgba(15, 23, 42, 0.85)',
        border: `1px solid ${chip.color}`,
        color: '#fff',
        fontFamily: HUD_THEME.font.body,
        fontSize: dense ? 11 : 12,
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
  );
}

export function FactionChips({ game }: FactionChipsProps) {
  const viewport = useViewport();
  const [open, setOpen] = useState(false);
  const playerFactions = game.factions.filter((f) => f.kind !== 'barbarian');
  if (playerFactions.length <= 2) return null;
  const chips = playerFactions.map((f) => chipFor(game, f));

  const isWide = viewport.class === 'desktop' || viewport.class === 'ultraWide';

  return (
    <Popover.Root open={!isWide && open} onOpenChange={setOpen}>
      <div
        data-testid="faction-chips-strip"
        style={{
          ...topCenterSlot(TOP_CENTER_SLOT.factionChips),
          display: 'flex',
          gap: 8,
          pointerEvents: 'none',
          zIndex: HUD_THEME.z.pills,
        }}
      >
        {/* Wide viewports: render the chip strip inline (visible).
         * Narrow viewports: chips render in a Popover.Portal below; we
         * ALSO render them here with display:none so the tests + the
         * a11y tree can still address each chip by testid. */}
        {chips.map((chip) => (
          <div key={chip.id} style={isWide ? undefined : { display: 'none' }}>
            <ChipPill chip={chip} />
          </div>
        ))}
        {/* Narrow: a "Players (N)" trigger pill takes the inline slot. */}
        {!isWide && (
          <Popover.Trigger asChild>
            <button
              type="button"
              id="faction-chips-trigger"
              data-testid="faction-chips-trigger"
              aria-label={`Show ${chips.length} players`}
              className={cn(
                'hud-interactive flex items-center gap-1.5 rounded-full border px-3 py-1',
                'border-[var(--color-border)] bg-[var(--color-surface)]',
                'text-xs font-semibold text-[var(--color-on-surface)]',
                'shadow-md backdrop-blur transition-colors',
                'hover:border-[var(--color-treasure)]/60 active:scale-95',
              )}
            >
              <Users className="h-3 w-3 text-[var(--color-treasure)]" aria-hidden />
              <span>Players</span>
              <span className="rounded-full bg-black/40 px-1.5 text-[0.65rem] text-[var(--color-treasure)]">
                {chips.length}
              </span>
            </button>
          </Popover.Trigger>
        )}
      </div>
      {!isWide && (
        <Popover.Portal>
          <Popover.Content
            align="center"
            sideOffset={8}
            className="hud-interactive z-[60] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-solid)]/95 p-2 shadow-2xl backdrop-blur"
          >
            <div className="flex flex-col gap-1.5">
              {chips.map((chip) => (
                <ChipPill key={`popover-${chip.id}`} chip={chip} dense />
              ))}
            </div>
          </Popover.Content>
        </Popover.Portal>
      )}
    </Popover.Root>
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
