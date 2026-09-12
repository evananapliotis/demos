/**
 * image-picks.json: which Pexels photo fills each slot. Hand-edited, committed.
 *
 *   "hero": 1234567                                   photo id
 *   "hero": { "id": 1234567, "focal": "top" }         photo id with a crop focus override
 *   "gallery-2": { "sameAs": "gallery-1", "treatment": "raw" }
 *                                                     reuse another slot's photo, optionally ungraded
 *   "hero": null                                      not picked yet
 */
import { existsSync, readFileSync } from 'node:fs';
import { z } from 'zod';
import { FOCAL_POSITIONS, getSearchedSlot, searchedSlotIds, type Focal } from '../../src/config/images.ts';

const focal = z.enum(FOCAL_POSITIONS).optional();
const photoId = z.number().int().positive();

export const PickSchema = z.union([
  z.null(),
  photoId,
  z.strictObject({ id: photoId, focal }),
  z.strictObject({ sameAs: z.enum(searchedSlotIds), treatment: z.enum(['raw', 'graded']), focal }),
]);

export const PicksSchema = z.partialRecord(z.enum(searchedSlotIds), PickSchema);

export type Pick = z.infer<typeof PickSchema>;
export type Picks = z.infer<typeof PicksSchema>;

export function readPicks(file: string): Picks {
  if (!existsSync(file)) throw new Error(`Picks file not found: ${file}`);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${file} is not valid JSON: ${(err as Error).message}`);
  }
  const result = PicksSchema.safeParse(json);
  if (!result.success) throw new Error(`${file} is invalid:\n\n${z.prettifyError(result.error)}\n`);
  return result.data;
}

export interface ResolvedPick {
  slot: string;
  /** Slot whose candidate folder holds the source photo. */
  sourceSlot: string;
  id: number;
  focal: Focal;
  graded: boolean;
}

/** Null when the slot has no pick. Throws when a sameAs target is itself unpicked or derived. */
export function resolvePick(picks: Picks, slotId: string): ResolvedPick | null {
  const slot = getSearchedSlot(slotId);
  const pick = picks[slotId as keyof Picks];
  if (pick === null || pick === undefined) return null;
  if (typeof pick === 'number') return { slot: slotId, sourceSlot: slotId, id: pick, focal: slot.focal, graded: true };
  if ('id' in pick) return { slot: slotId, sourceSlot: slotId, id: pick.id, focal: pick.focal ?? slot.focal, graded: true };

  const target = picks[pick.sameAs as keyof Picks];
  if (target === null || target === undefined) throw new Error(`"${slotId}" reuses "${pick.sameAs}" but that slot has no pick`);
  if (typeof target !== 'number' && !('id' in target)) throw new Error(`"${slotId}" reuses "${pick.sameAs}" which is itself a reuse. Point at the slot with the photo id.`);
  const id = typeof target === 'number' ? target : target.id;
  const targetFocal = typeof target === 'number' ? undefined : target.focal;
  return { slot: slotId, sourceSlot: pick.sameAs, id, focal: pick.focal ?? targetFocal ?? slot.focal, graded: pick.treatment === 'graded' };
}
