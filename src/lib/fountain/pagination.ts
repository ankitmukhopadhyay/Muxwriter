import type { ElementType, ScriptElement } from "./types";

/**
 * Splits the script into US Letter pages, the way real screenwriting software
 * lays a screenplay across discrete pages rather than one growing sheet.
 *
 * Heights are computed from screenplay geometry (12pt Courier is exactly 10
 * characters per inch and one line per 1/6 inch), matching the editor CSS, so
 * no DOM measurement or layout loop is needed. Breaks fall between elements;
 * a single element is never split across a page (an over long element simply
 * gets its own page and the cream sheet grows to hold it).
 */

// 12pt Courier rendered at 96dpi: 16px font, ~16.8px line box, 9.6px advance.
const LINE_PX = 16.8;
const CHAR_PX = 9.6;
const EM_PX = 16;

// Printable height inside a page: 11in tall minus 1in top and 1in bottom
// margins = 9in = 864px. Break a little early so minor rounding never spills.
const PAGE_CONTENT_PX = 9 * 96 - LINE_PX;

// Column widths in points, matching editor.css, converted to character counts.
const COLUMN_CHARS: Record<ElementType, number> = {
  scene_heading: Math.floor((6 * 96) / CHAR_PX), // 6in
  action: Math.floor((6 * 96) / CHAR_PX),
  character: Math.floor((4 * 96) / CHAR_PX),
  parenthetical: Math.floor((3 * 96) / CHAR_PX),
  dialogue: Math.floor((3.5 * 96) / CHAR_PX),
  transition: Math.floor((6 * 96) / CHAR_PX),
};

function wrappedLines(text: string, charsPerLine: number): number {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    lines += Math.max(1, Math.ceil(paragraph.length / charsPerLine));
  }
  return lines;
}

function isDialogueInner(type: ElementType): boolean {
  return type === "parenthetical" || type === "dialogue";
}

/** Top margin in px before an element, matching the editor CSS rhythm. */
function marginBefore(type: ElementType, prevType: ElementType | null): number {
  if (prevType === null) return 0; // first element on a page
  const contiguous =
    isDialogueInner(type) &&
    (prevType === "character" ||
      prevType === "parenthetical" ||
      prevType === "dialogue");
  if (contiguous) return 0;
  if (type === "scene_heading") return 2 * EM_PX;
  return EM_PX;
}

function elementBody(el: ScriptElement): number {
  return wrappedLines(el.text, COLUMN_CHARS[el.type]) * LINE_PX;
}

/** Groups elements into pages. Always returns at least one (possibly empty) page. */
export function paginate(elements: ScriptElement[]): ScriptElement[][] {
  const pages: ScriptElement[][] = [];
  let current: ScriptElement[] = [];
  let used = 0;
  let prevType: ElementType | null = null;

  for (const el of elements) {
    const first = current.length === 0;
    const top = first ? 0 : marginBefore(el.type, prevType);
    const height = top + elementBody(el);

    if (!first && used + height > PAGE_CONTENT_PX) {
      pages.push(current);
      current = [el];
      used = elementBody(el);
    } else {
      current.push(el);
      used += height;
    }
    prevType = el.type;
  }

  pages.push(current);
  return pages;
}
