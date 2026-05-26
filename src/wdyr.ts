/**
 * M_FUN.FOUNDATION.WHY-RENDER — dev-only React re-render tracer.
 *
 * Imported AT THE TOP of src/main.tsx INSIDE an
 * `if (import.meta.env.DEV)` guard so production builds don't pay
 * the runtime cost. The package patches React.createElement to log
 * re-renders that COULD have been skipped (props deep-equal, state
 * deep-equal). Components opt in per-file via
 *   `MyComponent.whyDidYouRender = true;`
 * so the noise stays scoped to components under investigation.
 *
 * Catches re-render storms that translate to user-visible jank
 * (e.g. the game-state object identity changing every tick re-
 * rendering the entire HUD even when nothing relevant changed).
 */

import whyDidYouRender from '@welldone-software/why-did-you-render';
import React from 'react';

if (import.meta.env.DEV) {
  whyDidYouRender(React, {
    trackAllPureComponents: false,
    logOnDifferentValues: true,
    // Don't spam on common React internals.
    titleColor: '#22c55e',
    diffNameColor: '#38bdf8',
  });
}
