globalThis.process ??= {}; globalThis.process.env ??= {};
import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_y1e7PzPl.mjs';
import { manifest } from './manifest_Bk5XjwKn.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin.astro.mjs');
const _page2 = () => import('./pages/api/admin/status.astro.mjs');
const _page3 = () => import('./pages/api/booking.astro.mjs');
const _page4 = () => import('./pages/apple-touch-icon.png.astro.mjs');
const _page5 = () => import('./pages/book/sent.astro.mjs');
const _page6 = () => import('./pages/book/unavailable.astro.mjs');
const _page7 = () => import('./pages/book.astro.mjs');
const _page8 = () => import('./pages/favicon.svg.astro.mjs');
const _page9 = () => import('./pages/robots.txt.astro.mjs');
const _page10 = () => import('./pages/sitemap.xml.astro.mjs');
const _page11 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/@astrojs/cloudflare/dist/entrypoints/image-endpoint.js", _page0],
    ["src/pages/admin/index.astro", _page1],
    ["src/pages/api/admin/status.ts", _page2],
    ["src/pages/api/booking.ts", _page3],
    ["src/pages/apple-touch-icon.png.ts", _page4],
    ["src/pages/book/sent.astro", _page5],
    ["src/pages/book/unavailable.astro", _page6],
    ["src/pages/book.astro", _page7],
    ["src/pages/favicon.svg.ts", _page8],
    ["src/pages/robots.txt.ts", _page9],
    ["src/pages/sitemap.xml.ts", _page10],
    ["src/pages/index.astro", _page11]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_astro-internal_middleware.mjs')
});
const _args = undefined;
const _exports = createExports(_manifest);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) {
	serverEntrypointModule[_start](_manifest, _args);
}

export { __astrojsSsrVirtualEntry as default, pageMap };
