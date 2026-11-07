import {readFileSync} from 'node:fs';
const c=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url),'utf8'));
if(!c.d1_databases?.[0]?.database_id||c.d1_databases[0].database_id==='00000000-0000-4000-8000-000000000000')throw Error('Create your Cloudflare D1 database and put its database_id in wrangler.jsonc first.');
if(!c.vars?.FIREBASE_PROJECT_ID)throw Error('Set the Firebase project ID in wrangler.jsonc first.');
console.log('Deployment identifiers configured. Also set the four public Firebase build variables and the STAFF_EMAILS runtime secret.');
