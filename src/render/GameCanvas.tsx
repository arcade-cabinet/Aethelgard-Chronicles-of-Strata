import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import { PCFSoftShadowMap } from 'three';
import type { GameState } from '@/game/game-state';
import { Buildings } from '@/world/Buildings';
import { CombatText } from '@/world/CombatText';
import { RainParticles } from '@/world/RainParticles';
import { RallyMarker } from '@/world/RallyMarker';
import { Mountains } from '@/world/Mountains';
import { Ramps } from '@/world/Ramps';
import { ResourceNodes } from '@/world/ResourceNodes';
import { SelectionRing } from '@/world/SelectionRing';
import { Terrain } from '@/world/Terrain';
import { type BuildContext, TileInteraction } from '@/world/TileInteraction';
import { Units } from '@/world/Units';
import { Water } from '@/world/Water';
import { DayNightCycle } from './DayNightCycle';
import { useGameLoop } from './useGameLoop';

/** Inner scene — runs inside the Canvas so r3f hooks are valid. */
function Scene({ game, buildContext }: { game: GameState; buildContext: BuildContext | null }) {
  useGameLoop(game);
  return (
    <>
      <DayNightCycle game={game} />
      <Terrain board={game.board} />
      <Mountains board={game.board} />
      <Ramps board={game.board} />
      <Water mapRadius={game.board.radius} />
      <TileInteraction game={game} buildContext={buildContext} />
      <Suspense fallback={null}>
        <ResourceNodes game={game} />
        <Buildings game={game} />
        <Units game={game} />
      </Suspense>
      <CombatText game={game} />
      <RainParticles game={game} />
      <RallyMarker game={game} />
      <SelectionRing game={game} />
      <OrbitControls maxPolarAngle={Math.PI / 2.1} />
    </>
  );
}

/** Props for the game canvas. */
export interface GameCanvasProps {
  /** The live game state to render. */
  game: GameState;
  /** The active build context (a building chosen to place), or null. */
  buildContext?: BuildContext | null;
}

/**
 * The react-three-fiber canvas hosting the board scene. Soft (PCF) shadows are
 * enabled for the gentle low-poly look; `DayNightCycle` adds distance fog and
 * drives the lighting.
 */
export function GameCanvas({ game, buildContext = null }: GameCanvasProps) {
  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ position: [0, 55, 62], fov: 42 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene game={game} buildContext={buildContext} />
    </Canvas>
  );
}
