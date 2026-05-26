/**
 * M_HUD.NOTIF.1 + M_HUD.NOTIF.2 — Aethelgard toast system.
 *
 * Other surfaces dispatch:
 *   window.dispatchEvent(new CustomEvent('aethelgard:toast', { detail: {
 *     id?: string,        // dedup key — if a toast with this id is
 *                         // already on screen, replace it instead of stacking
 *     title: string,
 *     description?: string,
 *     tone?: 'info' | 'success' | 'warning' | 'danger' | 'critical',
 *     focus?: { q: number; r: number; distance?: number },
 *                         // when present, the toast becomes tappable —
 *                         // tap fires `aethelgard:focus-tile` (CameraRig
 *                         // M_GAME.BUG.11 auto-focus tween)
 *     durationMs?: number, // default 6000; critical never auto-dismisses
 *   }}))
 *
 * Queue policy (per docs/specs/200-genre-commitment.md):
 *   - At most 3 simultaneous non-critical toasts visible.
 *   - FIFO: oldest non-critical dismisses when a 4th arrives.
 *   - Critical tone (`tone: 'critical'`) bypasses the cap and stacks on top.
 *   - Auto-dismiss after durationMs (6s default); critical NEVER auto-dismisses.
 *
 * Position: top-center, below the resource bar. Safe-area aware via
 * `env(safe-area-inset-top)` so it never collides with phone notches.
 */
import * as Toast from '@radix-ui/react-toast';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { HUD_THEME } from './hud-theme';

/** One toast in flight. */
export interface ToastSpec {
  /** Optional dedup key; same id replaces. */
  id?: string;
  /** Short headline. */
  title: string;
  /** Optional second line. */
  description?: string;
  /** Visual tone. */
  tone?: 'info' | 'success' | 'warning' | 'danger' | 'critical';
  /** When present, tap-to-zoom into this hex via auto-focus tween. */
  focus?: { q: number; r: number; distance?: number };
  /** Auto-dismiss ms. Default 6000. Critical never auto-dismisses. */
  durationMs?: number;
}

interface InFlight extends ToastSpec {
  /** Unique render key (monotonic). */
  key: number;
  /** Wall-clock when the toast entered the queue. */
  enteredAt: number;
}

const MAX_VISIBLE_NON_CRITICAL = 3;
const DEFAULT_DURATION_MS = 6000;

let nextKey = 1;

const toneColor: Record<NonNullable<ToastSpec['tone']>, string> = {
  info: HUD_THEME.color.accent,
  success: HUD_THEME.color.friendly,
  warning: HUD_THEME.color.coin,
  danger: HUD_THEME.color.danger,
  critical: HUD_THEME.color.danger,
};

/**
 * Mount once at the App root. Listens for `aethelgard:toast` events and
 * renders the queue inside a Radix Toast provider. The provider's
 * `swipeDirection` is 'right' so users can flick-dismiss on touch.
 */
export function Toasts() {
  const [queue, setQueue] = useState<InFlight[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ToastSpec>).detail;
      if (!detail || !detail.title) return;
      setQueue((prev) => {
        const next = [...prev];
        // Dedup by id if supplied — replace in-place.
        if (detail.id) {
          const idx = next.findIndex((t) => t.id === detail.id);
          const existing = idx >= 0 ? next[idx] : undefined;
          if (existing) {
            next[idx] = { ...detail, key: existing.key, enteredAt: Date.now() };
            return next;
          }
        }
        next.push({ ...detail, key: nextKey++, enteredAt: Date.now() });
        // Queue policy: 3 non-critical visible; oldest non-critical
        // dismisses when a 4th arrives. Critical never counts toward
        // the cap and never auto-evicts.
        const nonCritical = next.filter((t) => t.tone !== 'critical');
        if (nonCritical.length > MAX_VISIBLE_NON_CRITICAL) {
          const overflow = nonCritical.length - MAX_VISIBLE_NON_CRITICAL;
          // Drop the `overflow` oldest non-critical entries.
          const evictKeys = new Set(nonCritical.slice(0, overflow).map((t) => t.key));
          return next.filter((t) => !evictKeys.has(t.key));
        }
        return next;
      });
    };
    window.addEventListener('aethelgard:toast', handler);
    return () => window.removeEventListener('aethelgard:toast', handler);
  }, []);

  const dismiss = (key: number) => setQueue((prev) => prev.filter((t) => t.key !== key));

  return (
    <Toast.Provider swipeDirection="right" duration={DEFAULT_DURATION_MS}>
      <AnimatePresence initial={false}>
        {queue.map((toast) => {
          const tone = toast.tone ?? 'info';
          const accent = toneColor[tone];
          const focus = toast.focus;
          const tapToFocus = focus
            ? () => {
                window.dispatchEvent(new CustomEvent('aethelgard:focus-tile', { detail: focus }));
              }
            : undefined;
          return (
            <Toast.Root
              key={toast.key}
              asChild
              duration={tone === 'critical' ? Infinity : (toast.durationMs ?? DEFAULT_DURATION_MS)}
              onOpenChange={(open) => {
                if (!open) dismiss(toast.key);
              }}
              data-testid={`toast-${tone}${toast.id ? `-${toast.id}` : ''}`}
            >
              <motion.div
                initial={{ opacity: 0, y: -18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -18, transition: { duration: 0.18 } }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                onClick={tapToFocus}
                style={{
                  pointerEvents: 'auto',
                  minWidth: 240,
                  maxWidth: 360,
                  marginBottom: 8,
                  padding: '10px 14px',
                  borderRadius: HUD_THEME.radius,
                  background: HUD_THEME.color.panel,
                  border: `1px solid ${accent}`,
                  borderLeft: `4px solid ${accent}`,
                  color: HUD_THEME.color.text,
                  fontFamily: HUD_THEME.font.body,
                  cursor: tapToFocus ? 'pointer' : 'default',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
                }}
              >
                <Toast.Title asChild>
                  <div
                    style={{
                      color: accent,
                      fontWeight: 700,
                      fontSize: 13,
                      letterSpacing: 0.3,
                      textTransform: 'uppercase',
                    }}
                  >
                    {toast.title}
                  </div>
                </Toast.Title>
                {toast.description && (
                  <Toast.Description asChild>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 13,
                        color: HUD_THEME.color.text,
                        opacity: 0.92,
                      }}
                    >
                      {toast.description}
                    </div>
                  </Toast.Description>
                )}
                {tapToFocus && (
                  <div
                    style={{
                      marginTop: 6,
                      fontSize: 11,
                      color: accent,
                      opacity: 0.8,
                      fontStyle: 'italic',
                    }}
                  >
                    Tap to focus camera
                  </div>
                )}
              </motion.div>
            </Toast.Root>
          );
        })}
      </AnimatePresence>
      <Toast.Viewport
        style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 64px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 60,
          padding: 0,
          margin: 0,
          listStyle: 'none',
        }}
      />
    </Toast.Provider>
  );
}

/**
 * Imperative helper — small ergonomic wrapper for code that just wants
 * to fire a toast without dispatching the event manually.
 */
export function emitToast(spec: ToastSpec): void {
  window.dispatchEvent(new CustomEvent('aethelgard:toast', { detail: spec }));
}
