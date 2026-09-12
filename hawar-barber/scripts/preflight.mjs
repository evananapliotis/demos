// Refuses to deploy with the placeholder D1 id still in wrangler.toml.
import { readFileSync } from 'node:fs';
const toml = readFileSync('wrangler.toml', 'utf8');
if (/database_id\s*=\s*"REPLACE/.test(toml)) {
  console.error('wrangler.toml still has the placeholder database_id.\nRun:  npx wrangler d1 create hawar-barber-bookings\nthen paste the id it prints into wrangler.toml and deploy again.');
  process.exit(1);
}
console.log('preflight ok');
