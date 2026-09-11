/** Ninefold's mark: nine squares, three by three, bone on ink. */
export function markSvg(size = 64, inner = false): string {
  const cells: string[] = [];
  const pad = 14, gap = 5, cell = (size - pad * 2 - gap * 2) / 3;
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
    cells.push(`<rect x="${(pad + c * (cell + gap)).toFixed(2)}" y="${(pad + r * (cell + gap)).toFixed(2)}" width="${cell.toFixed(2)}" height="${cell.toFixed(2)}" fill="#ece7dd"/>`);
  }
  const body = `${inner ? '' : `<rect width="${size}" height="${size}" fill="#050505"/>`}${cells.join('')}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}">${body}</svg>`;
}
