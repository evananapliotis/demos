/** Small helpers for the JSON API routes. */
export const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers } });

export const isFormPost = (request: Request) => {
  const t = request.headers.get('content-type') ?? '';
  return t.includes('application/x-www-form-urlencoded') || t.includes('multipart/form-data');
};

/** JSON body or form fields, as one plain object. */
export async function readInput(request: Request): Promise<Record<string, unknown> | null> {
  try {
    if (isFormPost(request)) return Object.fromEntries((await request.formData()).entries());
    const body = (await request.json()) as unknown;
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const clientIp = (request: Request) => request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';

export const seeOther = (location: string) => new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
