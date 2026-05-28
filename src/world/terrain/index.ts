/**
 * world/terrain — the hex board ground plane + interaction surface
 * (M_V13.DECOMP.WORLD-TERRAIN).
 *
 * The merged terrain mesh (Terrain + terrain-mesh geometry builder,
 * which colors vertices from world/biomes' palette), the movement-
 * surface decorations (Roads, Crossings, PathLine), and the tile
 * interaction stack (TileInteraction + its HexGridOverlay long-press
 * feedback + touch-drag pan / touch-tap-threshold disambiguation).
 * Water (the map-boundary ocean) lives here as a terrain boundary
 * feature.
 */
export { Terrain } from './Terrain';
export { type TerrainGeometryData, buildTerrainGeometry } from './terrain-mesh';
export { Roads } from './Roads';
export { Crossings } from './Crossings';
export { TileInteraction, type BuildContext } from './TileInteraction';
export { HexGridOverlay, hexGridVisibility } from './HexGridOverlay';
export { Water } from './Water';
export { PathLine } from './PathLine';
export { startDrag, stopDrag, isDragging, computePanDelta, _resetForTest } from './touch-drag';
export { TAP_THRESHOLD_PX, isTap } from './touch-tap-threshold';
