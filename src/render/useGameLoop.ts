import { useFrame } from '@react-three/fiber';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import type { GameState } from '@/game/game-state';

/** Drive the ECS systems once per rendered frame. */
export function useGameLoop(game: GameState): void {
  useFrame((_, delta) => {
    pathFollowSystem(game.world, delta);
  });
}
