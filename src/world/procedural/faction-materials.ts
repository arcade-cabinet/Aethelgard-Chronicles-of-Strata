/**
 * M_V11.PROCMESH.MATERIALS — leaf module containing the cycle-free
 * substrate for per-faction primitive material overrides.
 *
 * - `FactionMaterials` type
 * - `resolveFactionMaterials` resolver
 * - the React `Context` + `useFactionMaterials` hook
 *
 * Buildings import ONLY from here (and from `./primitives`). The
 * provider component is in `FactionMaterialsProvider.tsx` and is
 * the ONE module that depends on `@/rules/skins` — so the cycle
 * skins → buildings → context → skins is broken: buildings only
 * touch this leaf module.
 */
import { createContext, useContext } from 'react';
import type { Faction } from '@/ecs/components';
import { DEFAULT_MATERIALS, type PrimitiveFamily, type PrimitiveMaterial } from './primitives';

export type FactionMaterials = Partial<Record<PrimitiveFamily, PrimitiveMaterial>>;

type MaterialsMap = Record<PrimitiveFamily, PrimitiveMaterial>;

/** Merge a faction's partial overrides on top of the default set so
 *  consumers always get a complete map. */
export function resolveFactionMaterials(
  // `faction` is on the signature for future telemetry/extension;
  // resolution today is purely the overrides + defaults.
  _faction: Faction,
  overrides: FactionMaterials | undefined,
): MaterialsMap {
  return {
    ...DEFAULT_MATERIALS,
    ...(overrides ?? {}),
  };
}

/** React context — declared here (leaf) so buildings can subscribe
 *  without importing the provider (which pulls in SKINS). */
export const FactionMaterialsContext = createContext<MaterialsMap>(DEFAULT_MATERIALS);

/** Hook used by tier-2 buildings (`src/world/procedural/buildings/*`)
 *  to pick a material by family. Default-mat fallback is automatic
 *  via the context default value. */
export function useFactionMaterials(): MaterialsMap {
  return useContext(FactionMaterialsContext);
}
