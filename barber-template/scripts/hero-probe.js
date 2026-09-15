/* Runs in the page. Returns every text element sitting directly on the hero
   photograph, with its box, its resolved sRGB colour and its effective size. */
(() => {
  const head = document.querySelector('header');
  // Canvas resolves any colour syntax — color-mix, oklab, rgba — to plain sRGB.
  const cv = document.createElement('canvas').getContext('2d');
  // Paint the colour and read the pixel back: this resolves any syntax the
  // browser accepts — color-mix, oklab, rgba — which string parsing does not.
  cv.canvas.width = cv.canvas.height = 1;
  const toHex = (css) => {
    cv.clearRect(0, 0, 1, 1);
    cv.fillStyle = '#000000';
    cv.fillStyle = css;
    cv.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = cv.getImageData(0, 0, 1, 1).data;
    // a partly transparent text colour sits on its backdrop; the channels are
    // what the ratio needs, and the alpha is accounted for by sampling the
    // backdrop separately
    if (a === 0) return '#000000';
    return '#' + [r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('');
  };

  const out = [];
  const seen = new Set();
  for (const el of head.querySelectorAll('h1 .letter, .eyebrow, p, a, span, [data-open-status]')) {
    const text = (el.textContent || '').trim();
    if (!text) continue;
    if ([...el.children].some((c) => (c.textContent || '').trim())) continue;
    if (seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
    // Only text on the photograph: anything inside a button or pill has its own
    // painted fill, which the palette gate already covers.
    let onPhoto = true;
    for (let n = el; n && n !== head; n = n.parentElement) {
      const m = getComputedStyle(n).backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
      const alpha = m ? (m[4] === undefined ? 1 : parseFloat(m[4])) : 0;
      if (alpha > 0.05) { onPhoto = false; break; }
    }
    if (!onPhoto) continue;
    // Decorative overlays are not text. The name's letters are aria-hidden only
    // because the h1 carries an aria-label, so they stay.
    if (el.closest('[aria-hidden="true"]') && !el.closest('h1')) continue;
    // The glyphs' own rectangles, not the element box: an anchor's box can
    // include a decorative rule that the letters never touch.
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = [...range.getClientRects()].filter((r) => r.width >= 2 && r.height >= 2);
    if (!rects.length) continue;
    const r = rects.reduce((a, c) => ({
      x: Math.min(a.x, c.x), y: Math.min(a.y, c.y),
      right: Math.max(a.right, c.right), bottom: Math.max(a.bottom, c.bottom),
      get width() { return this.right - this.x; }, get height() { return this.bottom - this.y; },
    }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
    const cls = el.className ? '.' + String(el.className).split(' ').filter(Boolean).slice(0, 2).join('.') : '';
    out.push({
      name: el.tagName.toLowerCase() + cls + ' "' + text.slice(0, 20) + '"',
      x: Math.max(0, Math.round(r.x)), y: Math.max(0, Math.round(r.y)),
      w: Math.round(r.width), h: Math.round(r.height),
      color: toHex(cs.color), px: parseFloat(cs.fontSize), bold: (parseInt(cs.fontWeight, 10) || 400) >= 700,
    });
  }
  return out;
})()
