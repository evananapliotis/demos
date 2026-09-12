/**
 * Small typed client for the parts of the Pexels API this project uses.
 * Docs: https://www.pexels.com/api/documentation/
 */
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Overridable so the scripts can be exercised against a local mock. */
export const PEXELS_API = (process.env.PEXELS_API_URL ?? 'https://api.pexels.com/v1').replace(/\/$/, '');

export const LICENCE = {
  name: 'Pexels License',
  url: 'https://www.pexels.com/license/',
} as const;

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  photographer: string;
  photographer_url: string;
  photographer_id: number;
  avg_color: string;
  alt: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

export interface SearchResponse {
  page: number;
  per_page: number;
  total_results: number;
  next_page?: string;
  photos: PexelsPhoto[];
}

/** Attribution record kept for every candidate and every committed photo. */
export interface Credit {
  id: number;
  photographer: string;
  photographerUrl: string;
  photoUrl: string;
  licence: string;
  licenceUrl: string;
  width: number;
  height: number;
  avgColor: string;
  /** Pexels' own description of the photo. Not used as alt text on the site. */
  description: string;
  /** Remote thumbnail (about 350px tall). */
  thumb: string;
  original: string;
  large2x: string;
}

export function toCredit(p: PexelsPhoto): Credit {
  return {
    id: p.id,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    photoUrl: p.url,
    licence: LICENCE.name,
    licenceUrl: LICENCE.url,
    width: p.width,
    height: p.height,
    avgColor: p.avg_color,
    description: p.alt ?? '',
    thumb: p.src.medium,
    original: p.src.original,
    large2x: p.src.large2x,
  };
}

export class PexelsClient {
  /** Requests left in the current window, from the last response. */
  remaining: number | null = null;

  constructor(private readonly apiKey: string) {}

  async search(params: { query: string; orientation: 'landscape' | 'portrait' | 'square'; perPage: number; page: number }): Promise<SearchResponse> {
    const qs = new URLSearchParams({
      query: params.query,
      orientation: params.orientation,
      per_page: String(params.perPage),
      page: String(params.page),
      size: 'medium',
    });
    return this.request<SearchResponse>(`/search?${qs}`);
  }

  async photo(id: number): Promise<PexelsPhoto> {
    return this.request<PexelsPhoto>(`/photos/${id}`);
  }

  private async request<T>(path: string): Promise<T> {
    const res = await fetch(`${PEXELS_API}${path}`, { headers: { Authorization: this.apiKey } });
    const remaining = res.headers.get('x-ratelimit-remaining');
    if (remaining !== null) this.remaining = Number(remaining);
    if (res.status === 429) {
      throw new Error('Pexels rate limit hit (200 requests/hour on the free tier). Wait and rerun; downloads already on disk are skipped.');
    }
    if (!res.ok) {
      const body = (await res.text()).slice(0, 200);
      throw new Error(`Pexels ${res.status} for ${path}: ${body}`);
    }
    return (await res.json()) as T;
  }
}

/** Download a URL to disk atomically. Returns the byte count. */
export async function download(url: string, dest: string): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status}) for ${url}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  writeFileSync(tmp, bytes);
  renameSync(tmp, dest);
  return bytes.length;
}
