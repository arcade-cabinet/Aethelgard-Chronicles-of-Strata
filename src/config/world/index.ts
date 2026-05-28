/**
 * config/world — the world-tuning domain bundle (M_V13.DECOMP.CONFIG-WORLD).
 *
 * Static world geometry + camera tuning (world.json: hex/tile/map/water
 * dimensions, camera profiles) and procedural map-generation rules
 * (mapgen.json: biome rules, map-type rules, volcano/quake/wildfire/
 * mountain tuning). This is the CONFIG side of the world; the renderer
 * lives in src/world/ (decomposed separately in §A3).
 */
export * from './world';
export * from './mapgen';
