/**
 * M_FUN.FOUNDATION.ZOD-CONFIG — Zod-validated typed accessor for
 * `asset-metadata.json`. Replaces the inline `as Record<...>` cast
 * in src/assets/assets.ts. Schema drift (a missing `kind`, an
 * invalid category) fails at module load instead of when a render
 * tries to mount a malformed asset.
 */
import { z } from 'zod';
import type { AssetEntry } from '@/assets/manifest-types';
import metadataJson from './asset-metadata.json';

const AssetEntrySchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  category: z.string().min(1),
  kind: z.enum(['glb', 'ogg', 'wav']),
  triangles: z.number().int().nonnegative().optional(),
  animations: z.array(z.string()),
  // Optional fields some entries may carry — keep the schema
  // permissive so it doesn't fail on new metadata not yet
  // covered by the canonical AssetEntry interface.
  bytes: z.number().int().nonnegative().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  pack: z.string().optional(),
});

const _validated = z.record(z.string(), AssetEntrySchema).parse(metadataJson);

/**
 * Validated asset metadata, keyed by stable logical id. Import this
 * (NOT the JSON) in any code that needs to look up an asset by id.
 */
export const ASSET_METADATA: Record<string, AssetEntry> = _validated as unknown as Record<
  string,
  AssetEntry
>;
