/**
 * M_FUN.REFACTOR.NEWGAMEMODAL-SPLIT — Segmented control extracted from
 * NewGameModal.tsx so SeedField, PresetControls, and OpponentPicker can
 * import it independently without circular deps.
 */

import { HUD_THEME } from './theme';

/** A segmented-control row of options. */
export function Segmented<T extends string>({
  value,
  options,
  labels,
  onChange,
}: {
  value: T;
  options: readonly T[];
  labels: Partial<Record<T, string>>;
  onChange: (v: T) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
      }}
    >
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            flex: '1 1 auto',
            padding: '7px 6px',
            borderRadius: 7,
            border: `1px solid ${value === opt ? HUD_THEME.color.accent : HUD_THEME.color.border}`,
            background: value === opt ? 'rgba(56,189,248,0.18)' : 'rgba(255,255,255,0.04)',
            color: value === opt ? HUD_THEME.color.text : HUD_THEME.color.muted,
            fontSize: '0.78rem',
            cursor: 'pointer',
            font: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {labels[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}
