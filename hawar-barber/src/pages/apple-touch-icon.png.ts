import type { APIRoute } from 'astro';
import sharp from 'sharp';

export const GET: APIRoute = async () => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 64 64"><rect width="64" height="64" fill="#0e0c0a"/><defs><clipPath id="c"><rect x="22" y="12" width="20" height="40" rx="4"/></clipPath></defs><g clip-path="url(#c)"><rect x="22" y="12" width="20" height="40" fill="#f4eee4"/><g fill="#f2a93b"><path d="M10 20l40-14v8L10 28z"/><path d="M10 36l40-14v8L10 44z"/><path d="M10 52l40-14v8L10 60z"/></g><g fill="#0e0c0a"><path d="M10 28l40-14v4L10 32z"/><path d="M10 44l40-14v4L10 48z"/></g></g><rect x="20" y="8" width="24" height="6" rx="2" fill="#d9d4cb"/><rect x="20" y="50" width="24" height="6" rx="2" fill="#d9d4cb"/></svg>`;
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
