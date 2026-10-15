// Verify the two park classes without requiring any remote Cloudflare access.
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const r=spawnSync(process.execPath,['--test','world/tests/zeffi-premium-park-v1.test.mjs'],{cwd:root,stdio:'inherit'});
if(r.status!==0)process.exit(r.status||1);
console.log('Zeffi premium parks V1: player 6x6, shared-only 6x6, walking perimeter and six WebP phases PASS');
