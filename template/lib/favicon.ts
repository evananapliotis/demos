/** A letter mark: near-black tile, accent bar, the first letter of the name. */
export function faviconSvg(name: string, accent: string): string {
  const letter = name.trim().charAt(0).toUpperCase();
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" fill="#0a0a0b"/>
<rect x="10" y="50" width="44" height="4" fill="${accent}"/>
<text x="32" y="44" text-anchor="middle" font-family="Arial Narrow, Arial, Helvetica, sans-serif" font-weight="700" font-size="40" fill="#ece7df">${letter}</text>
</svg>`;
}
