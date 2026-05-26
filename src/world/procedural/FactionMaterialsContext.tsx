/**
 * M_V11.PROCMESH.MATERIALS — context provider so buildings/* compositions
 * read per-faction primitive materials without prop-drilling through
 * every nested primitive. A building's parent (FactionBase or harness
 * fixture) wraps the tree in <FactionMaterialsProvider faction='player'>;
 * each composition pulls the resolved Record via useFactionMaterials().
 */
import { createContext, type ReactNode, useContext, useMemo } from 'react';
import type { Faction } from '@/ecs/components';
import { DEFAULT_MATERIALS, type PrimitiveFamily, type PrimitiveMaterial } from './primitives';
import { resolveFactionMaterials } from '@/rules/skins';

type MaterialsMap = Record<PrimitiveFamily, PrimitiveMaterial>;

const FactionMaterialsContext = createContext<MaterialsMap>(DEFAULT_MATERIALS);

export function FactionMaterialsProvider({
  faction,
  children,
}: {
  faction: Faction;
  children: ReactNode;
}) {
  const value = useMemo(() => resolveFactionMaterials(faction), [faction]);
  return (
    <FactionMaterialsContext.Provider value={value}>{children}</FactionMaterialsContext.Provider>
  );
}

/** Hook for buildings/* to pick a material by family. Default-mat
 *  fallback is automatic — never returns undefined. */
export function useFactionMaterials(): MaterialsMap {
  return useContext(FactionMaterialsContext);
}
