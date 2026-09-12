// Refuses to deploy with the placeholder D1 id still in wrangler.toml (the API would reject it after a full upload).
import { readFileSync } from 'node:fs';
const toml = readFileSync('wrangler.toml', 'utf8');
if (toml.includes('00000000-0000-0000-0000-000000000000')) {
  console.error('wrangler.toml still has the placeholder database_id.\nRun: npx wrangler d1 create hawar-barber-bookings   and paste the id it prints, then deploy again.');
  process.exit(1);
}
console.log('preflight ok');
