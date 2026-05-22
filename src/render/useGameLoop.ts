import { useFrame } from '@react-three/fiber';
import { animationSystem } from '@/ecs/systems/animation';
import { pathFollowSystem } from '@/ecs/systems/path-follow';
import type { GameState } from '@/game/game-state';

/** Drive the ECS systems once per rendered frame, in fixed order. */
export function useGameLoop(game: GameState): void {
  useFrame((_, delta) => {
    pathFollowSystem(game.world, delta);
    animationSystem(game.world);
  });
}
