import { useFrame } from '@react-three/fiber';
import { type GameState, runEconomyTick } from '@/game/game-state';

/** Drive the full ECS system loop once per rendered frame. */
export function useGameLoop(game: GameState): void {
  useFrame((_, delta) => {
    runEconomyTick(game, delta);
  });
}
