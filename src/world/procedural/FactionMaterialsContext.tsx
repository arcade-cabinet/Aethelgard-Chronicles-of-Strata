/**
 * M_V11.PROCMESH.MATERIALS — Provider component for the per-faction
 * primitive material context. Reads the SKINS registry (which lives
 * outside this dir) and resolves it into a complete materials map.
 *
 * This module is the ONLY procedural-tier file that depends on
 * `@/rules/skins`, by design. Buildings depend on the leaf
 * `./faction-materials` module (context + hook + type only) so the
 * skins → buildings → context → skins import cycle stays broken.
 *
 * Existing callers that imported the hook from this path still work
 * via the re-export at the bottom of this file.
 */
import { type ReactNode, useMemo } from 'react';
import type { Faction } from '@/ecs/components';
import { SKINS } from '@/rules/skins';
import { FactionMaterialsContext, resolveFactionMaterials } from './faction-materials';

export function FactionMaterialsProvider({
  faction,
  children,
}: {
  faction: Faction;
  children: ReactNode;
}) {
  const overrides = SKINS[faction]?.factionMaterials;
  const value = useMemo(() => resolveFactionMaterials(faction, overrides), [faction, overrides]);
  return (
    <FactionMaterialsContext.Provider value={value}>{children}</FactionMaterialsContext.Provider>
  );
}

// Compatibility re-export — original location of the hook. New
// callers should import directly from `./faction-materials`.
export { useFactionMaterials } from './faction-materials';
