import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { HUD_THEME } from './hud-theme';

/**
 * Global error surface. EVERY unhandled error, console.error, network
 * 404, asset load failure, react render error — pinned visibly in
 * the bottom-right of the screen. NO silent failures.
 *
 * Per user mandate (2026-05-24): "GO FIND EVERY FUCKING FALLBACK IN
 * THE CODE AND MAKE GODDAMN SURE PROBLEMS ACTUALLY SURFACE IN AN
 * ERROR MODAL OVERLAY"
 *
 * Hooks:
 *   - window.error                 → caught
 *   - window.unhandledrejection    → caught
 *   - console.error patched        → caught
 *   - fetch() patched              → 4xx/5xx caught
 *   - Image / GLB load failures    → caught via onerror
 *
 * Renders as a stack of dismissable cards. The dismissed-count is
 * the visible toll — even after clearing, the count of errors
 * remains shown so the user knows there WAS noise.
 */

interface ErrorEntry {
  id: number;
  source: string;
  message: string;
  at: number;
}

let nextId = 0;
const listeners = new Set<(errs: ErrorEntry[]) => void>();
let entries: ErrorEntry[] = [];
let totalEverSeen = 0;

function push(source: string, message: string): void {
  const e: ErrorEntry = { id: ++nextId, source, message, at: Date.now() };
  entries = [...entries, e];
  totalEverSeen++;
  for (const cb of listeners) cb(entries);
}

let installed = false;
/**
 * Install ALL error-capture hooks. Exported so main.tsx can call it
 * BEFORE any other module runs — anything that errors during initial
 * boot (font validation, asset preload, codegen, persistence) gets
 * caught and surfaced even though the ErrorOverlay React component
 * hasn't mounted yet (its useEffect-driven install would miss those).
 * Idempotent.
 */
export function installErrorOverlayHooks(): void {
  install();
}
function install(): void {
  if (installed) return;
  installed = true;

  // 1. Global errors
  window.addEventListener('error', (e) => {
    push('window.error', e.message ?? String(e.error ?? 'unknown'));
  });
  // 2. Unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const msg =
      reason instanceof Error ? `${reason.message}\n${reason.stack ?? ''}` : String(reason);
    push('unhandledrejection', msg);
  });
  // 3. Patch console.error so library errors surface
  const origConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    const msg = args
      .map((a) => (a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : String(a)))
      .join(' ');
    push('console.error', msg);
    origConsoleError(...args);
  };
  // 3b. M_POLISH3.FB.3 — also patch console.warn. Persistence /
  // resume / audio / onboarding all log warnings on real failures
  // that the user should see; surfacing them in the overlay lets
  // the agent + the player notice them without trawling DevTools.
  const origConsoleWarn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    const msg = args
      .map((a) => (a instanceof Error ? `${a.message}\n${a.stack ?? ''}` : String(a)))
      .join(' ');
    // suppress the well-known THREE.* deprecation warnings — they're
    // upstream noise on every page load, not actionable signals.
    if (!msg.startsWith('THREE.')) push('console.warn', msg);
    origConsoleWarn(...args);
  };
  // 4. Patch fetch so 4xx/5xx + network errors surface
  const origFetch = window.fetch.bind(window);
  window.fetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
    try {
      const res = await origFetch(...args);
      if (!res.ok) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        push('fetch.status', `${res.status} ${res.statusText} ${url}`);
      }
      return res;
    } catch (err) {
      const url = typeof args[0] === 'string' ? args[0] : String(args[0]);
      const msg = err instanceof Error ? err.message : String(err);
      push('fetch.error', `${msg} ${url}`);
      throw err;
    }
  };
  // 5. Resource loading errors (img/script/link/etc.)
  document.addEventListener(
    'error',
    (e) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = target.tagName?.toLowerCase();
      if (!tag || !['img', 'script', 'link', 'audio', 'video', 'source'].includes(tag)) return;
      const src = (target as HTMLImageElement).src ?? (target as HTMLLinkElement).href ?? '';
      push('resource.load', `${tag} failed: ${src}`);
    },
    true, // capture phase — error events on resources don't bubble
  );
}

/**
 * Test hook — clear current entries. The total-ever-seen counter
 * remains intact so tests can assert "no new errors after action X".
 */
export function _clearErrorOverlayForTests(): void {
  entries = [];
  for (const cb of listeners) cb(entries);
}

/** Test hook — read totalEverSeen for regression assertions. */
export function _getErrorOverlayTotalSeen(): number {
  return totalEverSeen;
}

export function ErrorOverlay(): ReactElement | null {
  const [items, setItems] = useState<ErrorEntry[]>(entries);

  useEffect(() => {
    install();
    const cb = (next: ErrorEntry[]): void => setItems(next);
    listeners.add(cb);
    setItems(entries);
    return () => {
      listeners.delete(cb);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      id="error-overlay"
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        bottom: 12,
        right: 12,
        zIndex: 9999,
        maxWidth: 'min(420px, 92vw)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        pointerEvents: 'auto',
        fontFamily: HUD_THEME.font.body,
      }}
    >
      <div
        style={{
          background: 'rgba(127, 29, 29, 0.96)',
          color: '#fee2e2',
          padding: '6px 10px',
          borderRadius: 8,
          fontSize: '0.72rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid rgba(254,202,202,0.4)',
        }}
      >
        <span>
          ⚠ {items.length} error{items.length === 1 ? '' : 's'} ({totalEverSeen} total this session)
        </span>
        <button
          type="button"
          onClick={() => _clearErrorOverlayForTests()}
          style={{
            background: 'rgba(0,0,0,0.4)',
            color: '#fee2e2',
            border: '1px solid rgba(254,202,202,0.4)',
            borderRadius: 4,
            padding: '2px 8px',
            fontSize: '0.7rem',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Clear
        </button>
      </div>
      <div
        style={{
          maxHeight: 'min(320px, 40vh)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        {items
          .slice(-30) // cap visible list; older still in totalEverSeen
          .map((e) => (
            <div
              key={e.id}
              style={{
                background: 'rgba(15, 23, 42, 0.96)',
                color: '#fecaca',
                padding: '6px 10px',
                borderRadius: 6,
                fontSize: '0.68rem',
                border: '1px solid rgba(248,113,113,0.4)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              <div style={{ color: '#fbbf24', fontWeight: 700 }}>{e.source}</div>
              {e.message.slice(0, 600)}
              {e.message.length > 600 ? '…' : ''}
            </div>
          ))}
      </div>
    </div>
  );
}
