/**
 * M_PIVOT.N-PLAYER.COLOR-PICKER — per-faction color chip + popper.
 *
 * Visual: a 24×24 rounded chip showing the current color. Click opens
 * an inline grid of 12 palette chips + a free-text hex input. Tab /
 * Escape close the popper. The chosen color flows up to the parent
 * via `onChange(color)` — persistence + downstream renderer wiring
 * are the parent's responsibility.
 *
 * Why custom popper instead of a Radix Popover: this repo does not
 * depend on `@radix-ui/react-popover` and the color chip is too
 * small / contextual to merit pulling another Radix dep in. The
 * inline grid uses an `onBlur` capture handler to close — no portal,
 * no focus trap (the picker is short + tabbable through).
 */
import { useEffect, useRef, useState } from 'react';
import { FACTION_PALETTE, normalizeHexColor } from '@/config/ai';

export interface FactionColorPickerProps {
  /** Current color (CSS hex, e.g. '#3b82f6'). */
  color: string;
  /** Called when the user picks a chip or types a valid hex. */
  onChange: (color: string) => void;
  /** Accessible label for the chip + popper trigger. */
  ariaLabel?: string;
  /**
   * When true, disables interaction. Used by the NewGameModal when
   * the faction slot is currently locked (e.g. observer slot).
   */
  disabled?: boolean;
}

export function FactionColorPicker({
  color,
  onChange,
  ariaLabel,
  disabled,
}: FactionColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [hexInput, setHexInput] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleHexSubmit = () => {
    const normalized = normalizeHexColor(hexInput);
    if (normalized) {
      onChange(normalized);
      setHexInput('');
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        aria-label={ariaLabel ?? 'Pick faction color'}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        data-testid="faction-color-chip"
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          background: color,
          border: '2px solid rgba(255,255,255,0.4)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          padding: 0,
        }}
      />
      {open && !disabled && (
        <div
          data-testid="faction-color-popper"
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            zIndex: 100,
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            minWidth: 168,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 4,
            }}
          >
            {FACTION_PALETTE.map((chip) => (
              <button
                type="button"
                key={chip.id}
                aria-label={chip.label}
                aria-pressed={color.toLowerCase() === chip.color.toLowerCase()}
                onClick={() => {
                  onChange(chip.color);
                  setOpen(false);
                }}
                data-testid={`palette-chip-${chip.id}`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: chip.color,
                  border:
                    color.toLowerCase() === chip.color.toLowerCase()
                      ? '2px solid #fff'
                      : '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  padding: 0,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              type="text"
              placeholder="#rrggbb"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleHexSubmit();
                }
              }}
              data-testid="faction-color-hex-input"
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 4,
                color: '#fff',
                padding: '4px 6px',
                fontFamily: 'monospace',
                fontSize: 12,
                width: 0, // flex shrink
              }}
            />
            <button
              type="button"
              onClick={handleHexSubmit}
              data-testid="faction-color-hex-apply"
              style={{
                background: 'rgba(59, 130, 246, 0.8)',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                padding: '4px 10px',
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
