import { resolve } from 'node:path';

export const PROJECT_ROOT = resolve(import.meta.dirname, '..', '..');
export const CANDIDATES_DIR = resolve(PROJECT_ROOT, '.candidates');
export const PUBLIC_IMG_DIR = resolve(PROJECT_ROOT, 'public', 'img');
export const PICKS_FILE = resolve(PROJECT_ROOT, 'image-picks.json');
export const CREDITS_FILE = resolve(PROJECT_ROOT, 'src', 'config', 'credits.json');
export const CONTACT_SHEET = resolve(CANDIDATES_DIR, 'contact-sheet.html');
export const STAMPS_FILE = resolve(CANDIDATES_DIR, 'grade-stamps.json');

export function slotDir(slotId: string): string {
  return resolve(CANDIDATES_DIR, slotId);
}

export function kb(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)}KB`;
}
