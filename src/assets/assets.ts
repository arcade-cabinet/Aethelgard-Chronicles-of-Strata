import manifestJson from '../../public/assets/manifest.json';
import { createAssetAccessor } from './manifest';
import type { AssetManifest } from './manifest-types';

/**
 * The application's asset accessor. The generated manifest is committed and
 * imported directly (Vite resolves the JSON at build time), so asset lookup is
 * synchronous — no manifest fetch, no loading state. URLs resolve against the
 * Vite base path so they work on both `/` (dev/native) and the Pages subpath.
 */
export const assets = createAssetAccessor(manifestJson as AssetManifest, import.meta.env.BASE_URL);
