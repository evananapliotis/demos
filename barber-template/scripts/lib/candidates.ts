/**
 * On-disk shape of .candidates/<slot>/credits.json, written by fetch-images
 * and read by grade-images and the contact sheet.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Credit } from './pexels.ts';
import { slotDir } from './paths.ts';

export interface Candidate extends Credit {
  rank: number;
  page: number;
  /** File name inside the slot directory. */
  file: string;
}

export interface SlotCredits {
  slot: string;
  query: string;
  orientation: string;
  fetchedAt: string;
  candidates: Candidate[];
}

export function creditsPath(slotId: string): string {
  return join(slotDir(slotId), 'credits.json');
}

export function readSlotCredits(slotId: string): SlotCredits | null {
  const file = creditsPath(slotId);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8')) as SlotCredits;
}

export function writeSlotCredits(credits: SlotCredits): void {
  mkdirSync(slotDir(credits.slot), { recursive: true });
  credits.candidates.sort((a, b) => a.rank - b.rank);
  writeFileSync(creditsPath(credits.slot), JSON.stringify(credits, null, 2) + '\n');
}
