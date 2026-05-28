import * as Progress from '@radix-ui/react-progress';
import { useEffect, useState } from 'react';
import { HUD_THEME } from '../theme';

/**
 * M_AUDIT2.UX.32 — generic loading overlay shown during the
 * TitleScreen→GameSession transition. startGame() can take 1–2s
 * (terrain gen + faction spawn + initial AI plan); the bare flash
 * to black was confusing.
 *
 * Indeterminate-style: we don't have real progress callbacks
 * through startGame, so the bar fakes 0→90% over the expected
 * wall-clock budget (1500ms) and then waits for the parent to
 * unmount it when the session is ready. Stalling at 90% — not
 * 100% — keeps the "completion lie" from showing if the actual
 * load runs over budget.
 */
export function LoadingScreen({ label = 'Forging the realm…' }: { label?: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // performance.now() here is intentional — the LoadingScreen is
    // pure presentation outside the sim/engine determinism scope
    // (gates.json bans Math.random/performance.now in src/sim, /engine,
    // /systems only). Snapshot tests of the loading animation would
    // need to mock this; none planned.
    let raf = 0;
    const start = performance.now();
    const tick = () => {
      const elapsed = performance.now() - start;
      // ease-out cap at 90% over 1500ms wall-clock budget.
      const t = Math.min(1, elapsed / 1500);
      const eased = 1 - (1 - t) ** 2;
      setProgress(Math.floor(eased * 90));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      id="loading-screen"
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background:
          'radial-gradient(circle at center, rgba(17,24,39,0.95) 0%, rgba(3,7,18,1) 100%)',
        color: HUD_THEME.color.text,
        fontFamily: HUD_THEME.font.display,
        zIndex: 500,
      }}
    >
      <h2
        style={{
          margin: 0,
          fontSize: '1.3rem',
          color: HUD_THEME.color.gold,
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </h2>
      <Progress.Root
        value={progress}
        max={100}
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(56,189,248,0.12)',
          borderRadius: 6,
          width: 280,
          height: 8,
          border: `1px solid ${HUD_THEME.color.border}`,
        }}
      >
        <Progress.Indicator
          style={{
            background: HUD_THEME.color.accent,
            width: '100%',
            height: '100%',
            transition: 'transform 200ms ease-out',
            transform: `translateX(-${100 - progress}%)`,
          }}
        />
      </Progress.Root>
    </div>
  );
}
