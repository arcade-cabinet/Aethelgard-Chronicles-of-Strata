import { OrbitControls } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import type { GameState } from '@/game/game-state';
import { HexTile } from '@/world/HexTile';

/** Props for the game canvas. */
export interface GameCanvasProps {
  /** The live game state to render. */
  game: GameState;
}

/**
 * The react-three-fiber canvas. Renders the board as hex-tile prisms under a
 * hemisphere + directional light rig, with orbit controls for inspection.
 */
export function GameCanvas({ game }: GameCanvasProps) {
  const tiles = [...game.board.tiles.values()];
  return (
    <Canvas
      shadows
      camera={{ position: [0, 40, 50], fov: 45 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <color attach="background" args={['#bae6fd']} />
      <hemisphereLight args={['#ffffff', '#444444', 1]} />
      <directionalLight position={[40, 60, 25]} intensity={1.5} castShadow />
      <group name="board">
        {tiles.map((t) => (
          <HexTile key={`${t.q},${t.r}`} q={t.q} r={t.r} level={t.level} type={t.type} />
        ))}
      </group>
      <OrbitControls maxPolarAngle={Math.PI / 2.1} />
    </Canvas>
  );
}
