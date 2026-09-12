/**
 * Worker entry: Astro handles requests; the cron trigger in wrangler.toml runs the nightly clean-up.
 */
import type { SSRManifest } from 'astro';
import type { ExecutionContext, ScheduledController } from '@cloudflare/workers-types';
import { App } from 'astro/app';
import { handle } from '@astrojs/cloudflare/handler';
import { site } from '@config';
import { purge, type Env } from './lib/db';

export function createExports(manifest: SSRManifest) {
  const app = new App(manifest);
  return {
    default: {
      fetch: (request: Request, env: Env, ctx: ExecutionContext) => handle(manifest, app, request as unknown as Parameters<typeof handle>[2], env as unknown as Parameters<typeof handle>[3], ctx as unknown as Parameters<typeof handle>[4]),
      scheduled: (_controller: ScheduledController, env: Env, ctx: ExecutionContext) => {
        ctx.waitUntil(purge(env.DB, site.booking.retentionDays).catch((e) => console.error('purge failed', e)));
      },
    },
  };
}
