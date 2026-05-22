import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Suspense } from 'react';
import type { GameState } from '@/game/game-state';
import { Buildings } from '@/world/Buildings';
import { CombatText } from '@/world/CombatText';
import { HexTile } from '@/world/HexTile';
import { ResourceNodes } from '@/world/ResourceNodes';
import { SelectionRing } from '@/world/SelectionRing';
import { TileInteraction } from '@/world/TileInteraction';
import { Units } from '@/world/Units';
import { useGameLoop } from './useGameLoop';

/** Inner scene — runs inside the Canvas so r3f hooks are valid. */
function Scene({ game }: { game: GameState }) {
  useGameLoop(game);
  const tiles = [...game.board.tiles.values()];
  return (
    <>
      <color attach="background" args={['#bae6fd']} />
      <hemisphereLight args={['#ffffff', '#444444', 1]} />
      <directionalLight position={[40, 60, 25]} intensity={1.5} castShadow />
      <group name="board">
        {tiles.map((t) => (
          <HexTile key={`${t.q},${t.r}`} q={t.q} r={t.r} level={t.level} type={t.type} />
        ))}
      </group>
      <TileInteraction game={game} />
      <Suspense fallback={null}>
        <ResourceNodes game={game} />
        <Buildings game={game} />
        <Units game={game} />
      </Suspense>
      <CombatText game={game} />
      <SelectionRing game={game} />
      <OrbitControls maxPolarAngle={Math.PI / 2.1} />
    </>
  );
}

/** Props for the game canvas. */
export interface GameCanvasProps {
  /** The live game state to render. */
  game: GameState;
}

/** The react-three-fiber canvas hosting the board scene. */
export function GameCanvas({ game }: GameCanvasProps) {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 40, 50], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene game={game} />
    </Canvas>
  );
}
