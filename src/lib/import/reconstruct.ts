/**
 * Pure helpers for reconstructing a screenplay from positioned PDF text.
 * Kept free of pdfjs (and its web worker) so it can be unit tested in Node.
 */

export interface Line {
  text: string;
  y: number;
}

/** Groups PDF text items into lines by vertical position, ordered top to bottom. */
export function pageToLines(
  items: { str: string; transform: number[] }[],
): Line[] {
  const buckets = new Map<number, { x: number; str: string }[]>();
  for (const item of items) {
    if (!item.str) continue;
    const x = item.transform[4];
    const y = Math.round(item.transform[5]);
    let key = y;
    for (const k of buckets.keys()) {
      if (Math.abs(k - y) <= 3) {
        key = k;
        break;
      }
    }
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push({ x, str: item.str });
  }

  const lines: Line[] = [];
  for (const [y, parts] of buckets) {
    parts.sort((a, b) => a.x - b.x);
    const text = parts
      .map((p) => p.str)
      .join("")
      .replace(/\s+/g, " ")
      .trim();
    if (text) lines.push({ text, y });
  }
  // PDF y increases upward, so descending y is top to bottom.
  lines.sort((a, b) => b.y - a.y);
  return lines;
}

/**
 * Reconstructs Fountain text from positioned lines: a blank line is inserted
 * wherever there is a vertical gap larger than normal single line spacing (or
 * a page reset), which is the spacing screenplays put between elements. The
 * Fountain parser then recovers scene headings, character cues, and dialogue.
 */
export function linesToFountain(lines: Line[]): string {
  if (lines.length === 0) return "";

  // The single line spacing is the SMALLEST gap between distinct lines (items
  // on the same baseline are already merged), so the minimum positive gap is
  // the line height. Mode or median fail when element gaps outnumber line gaps
  // (common in dialogue heavy scripts with many short elements).
  let lineGap = Infinity;
  for (let i = 1; i < lines.length; i++) {
    const gap = lines[i - 1].y - lines[i].y;
    if (gap > 0 && gap < lineGap) lineGap = gap;
  }
  if (!Number.isFinite(lineGap)) lineGap = 14;

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      const gap = lines[i - 1].y - lines[i].y;
      // Negative gap means a new page; a gap clearly bigger than the line
      // spacing means a new element. Either way, separate with a blank line.
      if (gap < 0 || gap > lineGap * 1.5) out.push("");
    }
    out.push(lines[i].text);
  }
  return out.join("\n");
}
