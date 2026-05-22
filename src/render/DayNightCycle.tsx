import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import { Color, type DirectionalLight } from 'three';
import { cyclePhase, lightIntensityAt, skyRgbAt } from '@/game/clock';
import type { GameState } from '@/game/game-state';

/**
 * Drives the day/night cycle each frame: the scene background color follows
 * the sky-color curve and the directional light intensity follows
 * `lightIntensityAt(phase)`, so the board visibly moves from a bright noon
 * through sunset into a dark, dim night and back. The cosine is evaluated once
 * per frame and the background Color object is mutated in place — no per-frame
 * string or Color allocation.
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
    const { r, g, b } = skyRgbAt(phase, intensity);
    skyColor.current.setRGB(r / 255, g / 255, b / 255);
    scene.background = skyColor.current;
  });

  return (
    <>
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
      <directionalLight ref={lightRef} position={[40, 60, 25]} intensity={1.5} castShadow />
    </>
  );
}
