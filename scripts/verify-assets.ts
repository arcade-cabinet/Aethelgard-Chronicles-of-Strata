import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ASSET_MAP } from './asset-map';

let missing = 0;
for (const item of ASSET_MAP) {
  if (!existsSync(join(process.cwd(), item.source))) {
    console.error(`MISSING SOURCE: ${item.source}`);
    missing += 1;
  }
}
if (missing > 0) {
  console.error(`${missing} asset(s) missing from references/.`);
  process.exit(1);
}
console.log(`All ${ASSET_MAP.length} mapped assets present in references/.`);
