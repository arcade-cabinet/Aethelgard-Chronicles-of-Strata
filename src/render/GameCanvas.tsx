import { Canvas } from '@react-three/fiber';
import { Suspense, useMemo } from 'react';
import { PCFSoftShadowMap } from 'three';
import type { GameState } from '@/game/game-state';
import { CameraRig } from './CameraRig';
import { type ViewportProfile, useViewport } from './useViewport';
import { HomeBase } from '@/world/HomeBase';
import { CombatText } from '@/world/CombatText';
import { Decoration } from '@/world/Decoration';
import { EnemyBase } from '@/world/EnemyBase';
import { RainParticles } from '@/world/RainParticles';
import { RallyMarker } from '@/world/RallyMarker';
import { Mountains } from '@/world/Mountains';
import { Crossings } from '@/world/Crossings';
import { ResourceNodes } from '@/world/ResourceNodes';
import { SelectionRing } from '@/world/SelectionRing';
import { Terrain } from '@/world/Terrain';
import { type BuildContext, TileInteraction } from '@/world/TileInteraction';
import { Units } from '@/world/Units';
import { Water } from '@/world/Water';
import { ZoneBorder } from '@/world/ZoneBorder';
import { DayNightCycle } from './DayNightCycle';
import { useGameLoop } from './useGameLoop';

/** Inner scene — runs inside the Canvas so r3f hooks are valid. */
function Scene({
  game,
  buildContext,
  viewport,
}: {
  game: GameState;
  buildContext: BuildContext | null;
  viewport: ViewportProfile;
}) {
  useGameLoop(game);

  // Build a set of hex tile keys that already have a resource node so the
  // Decoration component can skip those tiles. Memoised on the resource node
  // list (which is stable for the session lifetime).
  const occupiedKeys = useMemo<ReadonlySet<string>>(
    () => new Set(game.resourceNodes.map((n) => n.key)),
    [game.resourceNodes],
  );

  return (
    <>
      <DayNightCycle game={game} />
      <Terrain board={game.board} />
      <Mountains board={game.board} />
      <Crossings board={game.board} />
      <Water mapRadius={game.board.radius} />
      <TileInteraction game={game} buildContext={buildContext} />
      <Suspense fallback={null}>
        <Decoration board={game.board} occupiedKeys={occupiedKeys} />
        <ResourceNodes game={game} />
        <HomeBase game={game} />
        <EnemyBase game={game} />
        <Units game={game} />
      </Suspense>
      <CombatText game={game} />
      <RainParticles game={game} />
      <RallyMarker game={game} />
      <SelectionRing game={game} />
      <ZoneBorder game={game} />
      <CameraRig viewport={viewport} boardRadius={game.board.radius} />
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
 * The react-three-fiber canvas hosting the board scene. The viewport profile
 * (desktop / phone-landscape / phone-portrait) is resolved here and drives the
 * `CameraRig`'s default framing. Soft (PCF) shadows give the gentle low-poly
 * look; `DayNightCycle` adds distance fog and drives the lighting.
 */
export function GameCanvas({ game, buildContext = null }: GameCanvasProps) {
  const viewport = useViewport();
  return (
    <Canvas
      shadows={{ type: PCFSoftShadowMap }}
      camera={{ position: [0, 55, 62], fov: viewport.camera.fov }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <Scene game={game} buildContext={buildContext} viewport={viewport} />
    </Canvas>
  );
}
