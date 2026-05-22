import { useFrame } from '@react-three/fiber';
import { useAudio } from '@/audio/useAudio';
import { type GameState, runEconomyTick } from '@/game/game-state';

/**
 * Drive the full ECS system loop once per rendered frame, and wire game audio
 * (combat hits, win/loss stingers, the gameplay music loop) to the live state.
 */
export function useGameLoop(game: GameState): void {
  useAudio(game);
  useFrame((_, delta) => {
    runEconomyTick(game, delta);
  });
}
