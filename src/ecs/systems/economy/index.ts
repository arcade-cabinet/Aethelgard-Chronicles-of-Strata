/**
 * ecs/systems/economy — the resource + research per-tick systems
 * (M_DECOMP-ECS-GAME phase 1): harvest, deposit, hidden-bonus, science,
 * market-trade, loot-pickup.
 */
export { type ResourceDepositEvent, depositSystem } from './deposit';
export { harvestSystem } from './harvest';
export { type DiscoveredBonus, hiddenBonusSystem } from './hidden-bonus';
export { lootPickupSystem } from './loot-pickup';
export { marketTradeSystem } from './market-trade';
export { scienceSystem } from './science';
