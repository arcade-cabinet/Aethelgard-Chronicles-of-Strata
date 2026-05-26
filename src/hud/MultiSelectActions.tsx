/**
 * M_GAME.STACK.2b — multi-select Stack/Unstack actions.
 *
 * Floats a button next to the SelectionPanel when 2+ same-faction
 * military units are selected. Tap → createStack via the stacking
 * command + toast on success/failure. The action belongs visually
 * NEXT to the SelectionPanel rather than inside it because
 * SelectionPanel today is single-selection-shaped — adding multi-
 * select state would be a bigger refactor than this commit takes.
 *
 * Unstacking: when the selection includes a Stack member, the
 * button toggles to "Unstack" and calls dissolveStack on the
 * member's parent Stack.
 *
 * Mounted in App.tsx next to <SelectionPanel />.
 */
import { useRef, useState } from 'react';
import { Stack, StackMember } from '@/ecs/components';
import type { GameState } from '@/game/game-state';
import { selectedEntities } from '@/game/selection';
import { createStack, dissolveStack } from '@/game/stacking';
import { HUD_THEME } from './hud-theme';
import { emitToast } from './Toasts';
import { useRafLoopThrottled } from './useRafLoop';

interface MultiSelectState {
  /** Number of currently-selected entities. */
  count: number;
  /** Whether any selected entity is currently a Stack member. */
  inStack: boolean;
}

function snapshot(game: GameState): MultiSelectState {
  const entities = selectedEntities(game);
  let inStack = false;
  for (const e of entities) {
    if (e.has(StackMember)) {
      inStack = true;
      break;
    }
  }
  return { count: entities.length, inStack };
}

export function MultiSelectActions({ game }: { game: GameState }) {
  const [state, setState] = useState<MultiSelectState>(() => snapshot(game));
  const lastRef = useRef<MultiSelectState>(state);

  useRafLoopThrottled(
    () => {
      const next = snapshot(game);
      if (next.count !== lastRef.current.count || next.inStack !== lastRef.current.inStack) {
        lastRef.current = next;
        setState(next);
      }
    },
    200,
    [game],
  );

  const onStackTap = () => {
    const entities = selectedEntities(game);
    if (entities.length < 2) return;
    const result = createStack(game, entities);
    if (result.ok) {
      emitToast({
        id: 'stack-formed',
        tone: 'success',
        title: 'Stack formed',
        description: `${entities.length} units are now one cohort.`,
      });
    } else {
      emitToast({
        id: 'stack-failed',
        tone: 'warning',
        title: 'Stack failed',
        description: result.reason ?? 'Unknown error.',
      });
    }
  };

  const onUnstackTap = () => {
    const entities = selectedEntities(game);
    // Find the parent Stack of the first stacked member + dissolve it.
    for (const e of entities) {
      const m = e.get(StackMember);
      if (!m) continue;
      for (const s of game.world.query(Stack)) {
        if (s.id() === m.stackId) {
          dissolveStack(game, s);
          emitToast({
            id: 'stack-dissolved',
            tone: 'info',
            title: 'Stack dissolved',
            description: 'Members are individuals again.',
          });
          return;
        }
      }
    }
  };

  if (state.count < 2 && !state.inStack) return null;

  const showStack = state.count >= 2 && !state.inStack;
  const showUnstack = state.inStack;

  return (
    <div
      id="multi-select-actions"
      data-testid="multi-select-actions"
      style={{
        position: 'absolute',
        right: 16,
        bottom: 80,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'auto',
        zIndex: 5,
      }}
    >
      {showStack && (
        <button
          type="button"
          onClick={onStackTap}
          aria-label={`Stack ${state.count} selected units`}
          data-testid="multi-select-stack"
          style={{
            padding: '10px 18px',
            minHeight: 44,
            background: HUD_THEME.blueGradient,
            color: '#fff',
            border: 'none',
            borderRadius: HUD_THEME.radius,
            fontFamily: HUD_THEME.font.body,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          ⛒ Stack {state.count}
        </button>
      )}
      {showUnstack && (
        <button
          type="button"
          onClick={onUnstackTap}
          aria-label="Unstack the selected cohort"
          data-testid="multi-select-unstack"
          style={{
            padding: '10px 18px',
            minHeight: 44,
            background: 'rgba(239, 68, 68, 0.85)',
            color: '#fff',
            border: 'none',
            borderRadius: HUD_THEME.radius,
            fontFamily: HUD_THEME.font.body,
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          ⛓ Unstack
        </button>
      )}
    </div>
  );
}
