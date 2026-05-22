# Asset Pipeline

## Overview

Raw asset files live under `references/` (curated from KayKit, Kenney, and the
conversation's described asset list). The ingest script processes them into
`public/assets/`, generating a `manifest.json` index. Application code never
references asset paths directly — it uses the typed accessor produced by
`createAssetAccessor(manifest)`.

## Directory Layout

```
references/
  characters/    KayKit rigged GLBs (heroes, enemies, animation GLBs)
  buildings/     KayKit buildings (town hall, farm, barracks, portal)
  props/         Kenney/KayKit environment props (trees, rocks, cacti, etc.)
  audio/         OGG (primary) + WAV (fallback) files for all sound events

public/assets/   GENERATED — do not hand-edit
  characters/
  buildings/
  props/
  audio/
  manifest.json  machine-generated index of all assets
```

## The Ingest Flow

The ingest script (`scripts/ingest-assets.ts`, run via `pnpm ingest`) performs:

1. **Walk** the `references/` directory recursively.
2. **Filter** to `.glb` and `.ogg`/`.wav` files only. Skip any file not in these
   extensions — no raw textures, no FBX, no Blender source files.
3. **Copy** each file to the parallel path under `public/assets/`, preserving the
   subdirectory structure from `references/`.
4. **Deduplicate** by content hash — if the same file exists under two names, only
   one copy is emitted, and the manifest records both logical IDs pointing to the
   same output path.
5. **Write** `public/assets/manifest.json` with the complete asset index.

The ingest script is idempotent. Running it twice produces the same output.

## manifest.json Contract

```typescript
type AssetEntry = {
  logicalId: string;      // e.g. "characters/knight"
  path: string;           // e.g. "/assets/characters/knight.glb"
  type: "glb" | "audio";
  size: number;           // bytes
  sha256: string;         // content hash for deduplication
};

type AssetManifest = {
  version: number;        // incremented by ingest script
  generatedAt: string;   // ISO 8601 timestamp
  assets: AssetEntry[];
};
```

The manifest version is a monotonically increasing integer. Tests verify that the
manifest version matches the `EXPECTED_MANIFEST_VERSION` constant in
`tests/unit/asset-manifest.test.ts`.

## The Typed Accessor

`src/core/assets.ts` exports `createAssetAccessor(manifest: AssetManifest)`. It
returns an object where logical asset IDs are typed keys and values are resolved
`/assets/...` paths. TypeScript enforces that callers cannot reference a logical ID
that does not exist in the manifest.

```typescript
const assets = createAssetAccessor(manifest);
useGLTF(assets["characters/knight"]);   // typed, no hard-coded path
useAudio(assets["audio/footstep-grass"]); // same pattern
```

## asset-map.ts Curation

`src/core/asset-map.ts` is the human-authored curation list. It maps logical IDs to
the `references/` source path for any asset that needs a non-obvious mapping (e.g.,
a shared animation GLB that serves multiple character types). The ingest script reads
this map before walking the directory tree, so curated entries take precedence over
the auto-discovered path.

## Shared-Rig Note

KayKit provides two animation source GLBs: `Rig_Medium.glb` and `Rig_Large.glb`.
All medium-rig characters (knight, mage, ranger, barbarian, etc.) and large-rig
characters (orc, werewolf, frost golem) share a single skeletal hierarchy. The ingest
script copies these animation GLBs as `characters/rig-medium-anims.glb` and
`characters/rig-large-anims.glb`. The character factory binds each character's mesh
to the correct animation GLB at runtime via `useAnimations`. See `60-characters.md`
for the full retargeting contract.

## Compression

The ingest script applies gltf-transform's `draco` and `meshopt` compression passes
to all GLBs that exceed 500 KB. This keeps load times reasonable without cutting
content. No manual compression step is required — it runs as part of `pnpm ingest`.

## Size Policy

There is no asset size budget gate. The game ships whatever assets make it full and
fun. The `scripts/verify-assets.ts` script (`pnpm verify-assets`) validates that every
manifest entry has a corresponding file on disk and that the content hashes match —
but it does NOT fail on total size.

## Licensing

| Source | License | Requirement |
|---|---|---|
| Kenney.nl | CC0 1.0 Universal | No attribution required, but credit is appreciated |
| KayKit (Kay Lousberg) | CC BY 4.0 | Credits screen attribution: "Characters & Buildings: KayKit by Kay Lousberg (kaylousberg.com)" |

The credits screen (shown in the win/loss modal footer and the launcher) must include
the KayKit attribution line. Omitting it is a build-failing bug.
