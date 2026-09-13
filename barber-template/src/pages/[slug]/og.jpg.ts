/**
 * /<slug>/og.jpg: the link-preview image for each demo page, rendered
 * at build time from the listing's first photo, name, address and rating.
 */
import type { APIRoute } from 'astro';
import { derive } from '../../lib/demo.ts';
import { renderOg } from '../../lib/og.ts';
import { shops, type Shop } from '../../lib/shops.ts';

export function getStaticPaths() {
  return shops.map((shop) => ({ params: { slug: shop.slug }, props: { shop } }));
}

export const GET: APIRoute<{ shop: Shop }> = async ({ props }) => {
  const jpeg = await renderOg(derive(props.shop));
  return new Response(new Uint8Array(jpeg), { headers: { 'Content-Type': 'image/jpeg' } });
};
