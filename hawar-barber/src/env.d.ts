/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />
type Runtime = import('@astrojs/cloudflare').Runtime<import('./lib/db').Env>;
declare namespace App {
  interface Locals extends Runtime {}
}
