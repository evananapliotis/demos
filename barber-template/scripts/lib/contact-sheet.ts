/**
 * Writes .candidates/contact-sheet.html: every fetched candidate for every
 * slot, cropped in CSS to the slot's aspect, with a picker that builds the
 * image-picks.json for you to copy. Thumbnails load from Pexels' CDN so the
 * file works anywhere; the local JPEGs are only used by the grade step.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { searchedSlots } from '../../src/config/images.ts';
import { readSlotCredits } from './candidates.ts';
import { CONTACT_SHEET, PICKS_FILE } from './paths.ts';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function writeContactSheet(): void {
  const currentPicks = existsSync(PICKS_FILE) ? JSON.parse(readFileSync(PICKS_FILE, 'utf8')) : {};

  const slotsJson = searchedSlots.map((s) => ({ id: s.id, role: s.role ?? null, group: s.group ?? null }));

  const sections = searchedSlots
    .map((slot) => {
      const credits = readSlotCredits(slot.id);
      const [aw, ah] = slot.aspect;
      const cards = (credits?.candidates ?? [])
        .map(
          (c) => `
        <label class="card" data-slot="${slot.id}" data-id="${c.id}">
          <input type="radio" name="${slot.id}" value="${c.id}">
          <span class="frame" style="aspect-ratio:${aw}/${ah}"><img loading="lazy" src="${esc(c.thumb)}" alt=""></span>
          <span class="meta">
            <b>#${c.rank}</b> <code>${c.id}</code> ${c.width}&times;${c.height}<br>
            <a href="${esc(c.photographerUrl)}" target="_blank" rel="noopener">${esc(c.photographer)}</a>
            &middot; <a href="${esc(c.photoUrl)}" target="_blank" rel="noopener">Pexels &#8599;</a>
          </span>
        </label>`,
        )
        .join('');
      const derive =
        slot.role === 'before'
          ? `<label class="opt"><input type="radio" name="${slot.id}" value="derive"> Reuse the <code>${slot.group}-after</code> photo, ungraded (placeholder)</label>`
          : '';
      return `
    <section id="${slot.id}">
      <h2>${slot.id}</h2>
      <p class="q">&ldquo;${esc(slot.query)}&rdquo; &middot; ${slot.orientation} ${aw}:${ah} &middot; widths ${slot.widths.join('/')} &middot; &le;${slot.budgetKB}KB
        ${credits ? `&middot; ${credits.candidates.length} candidates` : '&middot; <em>nothing fetched yet</em>'}</p>
      <div class="opts"><label class="opt"><input type="radio" name="${slot.id}" value="none" checked> None</label>${derive}</div>
      <div class="grid">${cards}</div>
    </section>`;
    })
    .join('');

  const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidates: Halden &amp; Crane</title>
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #16130f; color: #e9e2d6; font: 14px/1.45 system-ui, sans-serif; padding: 0 16px 220px; }
  header { position: sticky; top: 0; background: #16130fee; padding: 12px 0; border-bottom: 1px solid #3a322a; z-index: 2; }
  header nav a { color: #d9a45b; margin-right: 10px; font-size: 12px; text-decoration: none; }
  header nav a.done { color: #7fbf7f; }
  h1 { font-size: 18px; margin: 0 0 6px; }
  h2 { font-size: 16px; margin: 28px 0 2px; font-family: ui-monospace, monospace; }
  .q { margin: 0 0 8px; color: #a89e90; }
  .opts { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 8px; }
  .opt { color: #c8bfae; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; }
  .card { display: block; border: 2px solid transparent; border-radius: 6px; padding: 6px; background: #201b16; cursor: pointer; }
  .card:has(input:checked) { border-color: #d9a45b; background: #2a2219; }
  .card input { position: absolute; opacity: 0; }
  .frame { display: block; width: 100%; overflow: hidden; border-radius: 4px; background: #000; }
  .frame img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .meta { display: block; margin-top: 6px; font-size: 12px; color: #c8bfae; }
  .meta a { color: #d9a45b; }
  code { color: #f0c98a; }
  #panel { position: fixed; left: 0; right: 0; bottom: 0; background: #0f0d0a; border-top: 1px solid #3a322a; padding: 10px 16px; display: grid; grid-template-columns: 1fr auto; gap: 8px 16px; align-items: start; }
  #panel pre { margin: 0; max-height: 150px; overflow: auto; font-size: 11px; color: #c8bfae; }
  #panel .actions { display: grid; gap: 6px; }
  button { background: #d9a45b; color: #16130f; border: 0; border-radius: 4px; padding: 8px 12px; font-weight: 600; cursor: pointer; }
  button.quiet { background: #3a322a; color: #e9e2d6; }
  #count { font-size: 12px; color: #a89e90; }
</style>
<header>
  <h1>Pick one candidate per slot</h1>
  <nav id="nav"></nav>
</header>
<main>${sections}</main>
<div id="panel">
  <pre id="out"></pre>
  <div class="actions">
    <span id="count"></span>
    <button id="copy">Copy JSON</button>
    <button id="dl">Download image-picks.json</button>
    <button id="reset" class="quiet">Reset to file</button>
  </div>
</div>
<script>
  const SLOTS = ${JSON.stringify(slotsJson)};
  const FROM_FILE = ${JSON.stringify(currentPicks)};
  const KEY = 'hc-image-picks';
  const idOf = (p) => (typeof p === 'number' ? p : p && typeof p === 'object' && 'id' in p ? p.id : null);
  let picks = {};
  function load() {
    picks = {};
    for (const s of SLOTS) picks[s.id] = FROM_FILE[s.id] ?? null;
    try { Object.assign(picks, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch {}
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(picks)); } catch {} }
  function syncInputs() {
    for (const s of SLOTS) {
      const p = picks[s.id];
      const value = p && typeof p === 'object' && 'sameAs' in p ? 'derive' : idOf(p) ? String(idOf(p)) : 'none';
      const input = document.querySelector('input[name="' + s.id + '"][value="' + value + '"]');
      if (input) input.checked = true;
      else { picks[s.id] = null; const none = document.querySelector('input[name="' + s.id + '"][value="none"]'); if (none) none.checked = true; }
    }
  }
  function render() {
    const ordered = {};
    for (const s of SLOTS) ordered[s.id] = picks[s.id] ?? null;
    document.getElementById('out').textContent = JSON.stringify(ordered, null, 2);
    const done = SLOTS.filter((s) => picks[s.id]).length;
    document.getElementById('count').textContent = done + ' of ' + SLOTS.length + ' slots picked';
    document.getElementById('nav').innerHTML = SLOTS.map((s) => '<a href="#' + s.id + '" class="' + (picks[s.id] ? 'done' : '') + '">' + s.id + '</a>').join('');
  }
  document.addEventListener('change', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'radio') return;
    const slot = SLOTS.find((s) => s.id === input.name);
    if (!slot) return;
    if (input.value === 'none') picks[slot.id] = null;
    else if (input.value === 'derive') picks[slot.id] = { sameAs: slot.group + '-after', treatment: 'raw' };
    else picks[slot.id] = Number(input.value);
    save(); render();
  });
  document.getElementById('copy').onclick = () => navigator.clipboard.writeText(document.getElementById('out').textContent);
  document.getElementById('dl').onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([document.getElementById('out').textContent + '\\n'], { type: 'application/json' }));
    a.download = 'image-picks.json'; a.click();
  };
  document.getElementById('reset').onclick = () => { localStorage.removeItem(KEY); load(); syncInputs(); render(); };
  load(); syncInputs(); render();
</script>
`;
  writeFileSync(CONTACT_SHEET, html);
}
