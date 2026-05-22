import { useThree } from '@react-three/fiber';
import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type DirectionalLight } from 'three';
import { cyclePhase, lightIntensityAt, skyColorAt } from '@/game/clock';
import type { GameState } from '@/game/game-state';

/**
 * Drives the day/night cycle each frame: the scene background color follows
 * `skyColorAt(phase)` and the directional light intensity follows
 * `lightIntensityAt(phase)`, so the board visibly moves from a bright noon
 * through sunset into a dark, dim night and back.
 */
export function DayNightCycle({ game }: { game: GameState }) {
  const lightRef = useRef<DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const skyColor = useRef(new Color('#bae6fd'));

  useFrame(() => {
    const phase = cyclePhase(game.clock);
    const intensity = lightIntensityAt(phase);
    if (lightRef.current) {
      lightRef.current.intensity = 0.3 + intensity * 1.4;
    }
    skyColor.current.set(skyColorAt(phase));
    scene.background = skyColor.current;
  });

  return (
    <>
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
      <directionalLight ref={lightRef} position={[40, 60, 25]} intensity={1.5} castShadow />
    </>
  );
}
