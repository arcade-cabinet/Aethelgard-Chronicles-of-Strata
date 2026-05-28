/**
 * game/utilities — supporting game-layer helpers (M_DECOMP-ECS-GAME
 * phase 2): mapgen-helpers (balance gates), projectiles, rally points,
 * auto-save timer, the dev/test harness installer, and the player
 * command surface. commands→rally is intra-group; the rest reach UP to
 * the game-root hubs (economy/game-state/research) via ../.
 */
export { matchLengthScale, passes4xBalanceGates, findBalancedBoard } from './mapgen-helpers';
export {
  type Projectile,
  PROJECTILE_LIFETIME,
  spawnProjectile,
  advanceProjectiles,
} from './projectiles';
export { type RallyState, createRally, setRallyPoint, applyRallyPoint } from './rally';
export { AUTO_SAVE_INTERVAL, type AutoSave, createAutoSave, tickAutoSave } from './auto-save';
export { installDevHarness } from './dev-harness';
export {
  moveUnit,
  setStance,
  planMoveOrder,
  issueMoveOrder,
  placeBuilding,
  placeRoad,
  trainUnit,
  foundBase,
  endTurn,
  resign,
  setRally,
  upgradeBuilding,
  tradeResource,
  doResearch,
  setPeonAutoMode,
  findSelectableAtTile,
} from './commands';
