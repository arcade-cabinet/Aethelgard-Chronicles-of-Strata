/**
 * config/economy — the economy domain bundle (M_V13.DECOMP.CONFIG-ECONOMY).
 *
 * The resource registry (resources.json + typed accessor) and the
 * economy tuning (economy.json + Zod-validated accessor: building/unit/
 * supply costs, harvest yields). Resources is the upstream registry the
 * economy schema builds its ResourceCost slots from, so the two live in
 * one bundle.
 */
export * from './resources';
export * from './economy';
