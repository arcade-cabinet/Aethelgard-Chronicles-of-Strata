import { useEffect, useState } from 'react';
import { type Caption, getLiveCaptions, subscribeCaptions } from './captions';
import { HUD_THEME } from './theme';

/**
 * M_EXPANSION.U.114 — visible captions band at the bottom of the
 * screen. Listens to the captions registry, prunes expired entries
 * on a 250ms tick, renders a small stack of up to 3 caption pills.
 *
 * `pointer-events: none` — captions never block gameplay clicks.
 */
export function CaptionsOverlay() {
  const [captions, setCaptions] = useState<ReadonlyArray<Caption>>(() => getLiveCaptions());

  useEffect(() => {
    const unsub = subscribeCaptions((next) => {
      setCaptions([...next]);
    });
    // 250ms prune tick — getLiveCaptions filters expired entries and
    // notifies subscribers, so the band fades as captions time out
    // even when no new events are firing.
    const id = window.setInterval(() => {
      const live = getLiveCaptions();
      setCaptions([...live]);
    }, 250);
    return () => {
      unsub();
      window.clearInterval(id);
    };
  }, []);

  if (captions.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        pointerEvents: 'none',
        zIndex: 95,
      }}
      data-testid="captions-overlay"
    >
      {captions.map((c) => (
        <div
          key={c.id}
          style={{
            background: 'rgba(15, 23, 42, 0.82)',
            border: `1px solid ${HUD_THEME.color.border}`,
            color: HUD_THEME.color.accent,
            fontFamily: HUD_THEME.font.body,
            fontWeight: 600,
            fontSize: '0.85rem',
            padding: '6px 14px',
            borderRadius: 999,
            maxWidth: 'min(360px, 90vw)',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          {c.text}
        </div>
      ))}
    </div>
  );
}
