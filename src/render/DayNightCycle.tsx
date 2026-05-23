import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { Color, type DirectionalLight, FogExp2 } from 'three';
import { cyclePhase, lightIntensityAt, skyRgbAt } from '@/game/clock';
import type { GameState } from '@/game/game-state';

/** Exponential-fog density — a soft distance haze, matching poc1. */
const FOG_DENSITY = 0.01;

/**
 * Drives the day/night cycle each frame: the scene background and the distance
 * fog follow the sky-color curve, and the directional light intensity follows
 * `lightIntensityAt(phase)`, so the board visibly moves from a bright noon
 * through sunset into a dark, dim night and back. The cosine is evaluated once
 * per frame and the colors are mutated in place — no per-frame allocation.
 */
export function DayNightCycle({ game }: { game: GameState }) {
  const lightRef = useRef<DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const skyColor = useRef(new Color('#bae6fd'));
  const fog = useRef(new FogExp2('#bae6fd', FOG_DENSITY));

  // attach exponential distance fog once
  useEffect(() => {
    scene.fog = fog.current;
    return () => {
      scene.fog = null;
    };
  }, [scene]);

  // tune the shadow camera for the board-sized scene
  useEffect(() => {
    const light = lightRef.current;
    if (!light) return;
    light.shadow.mapSize.set(2048, 2048);
    light.shadow.camera.left = -60;
    light.shadow.camera.right = 60;
    light.shadow.camera.top = 60;
    light.shadow.camera.bottom = -60;
    light.shadow.bias = -0.0005;
    light.shadow.camera.updateProjectionMatrix();
  }, []);

  useFrame(() => {
    const phase = cyclePhase(game.clock);
    const intensity = lightIntensityAt(phase);
    if (lightRef.current) {
      lightRef.current.intensity = 0.3 + intensity * 1.4;
    }
    const { r, g, b } = skyRgbAt(phase, intensity);
    skyColor.current.setRGB(r / 255, g / 255, b / 255);
    scene.background = skyColor.current;
    fog.current.color.setRGB(r / 255, g / 255, b / 255);
  });

  return (
    <>
      <hemisphereLight args={['#ffffff', '#444444', 0.6]} />
      <directionalLight ref={lightRef} position={[40, 60, 25]} intensity={1.5} castShadow />
    </>
  );
}
