import type { ElementType, ScriptElement } from "./types";

/** Roughly 55 text lines fit on a US Letter screenplay page. */
const LINES_PER_PAGE = 55;

/** Character widths of each element's column at 10 characters per inch. */
const COLUMN_WIDTH: Record<ElementType, number> = {
  scene_heading: 60,
  action: 60,
  character: 38,
  parenthetical: 25,
  dialogue: 35,
  transition: 60,
};

/** Blank lines conventionally placed before an element on the page. */
const LEADING_BLANKS: Record<ElementType, number> = {
  scene_heading: 1,
  action: 1,
  character: 1,
  parenthetical: 0,
  dialogue: 0,
  transition: 1,
};

function wrappedLines(text: string, width: number): number {
  let lines = 0;
  for (const paragraph of text.split("\n")) {
    lines += Math.max(1, Math.ceil(paragraph.length / width));
  }
  return lines;
}

export interface RuntimeEstimate {
  pages: number;
  /** Page count rendered in screenplay eighths, e.g. "2 3/8". */
  pagesLabel: string;
  /** Estimated screen time in minutes (about one minute per page). */
  minutes: number;
}

/**
 * Estimates page count and screen time from the element list. This is a
 * heuristic, not a true paginator: it sums wrapped line counts per element
 * plus conventional spacing, then divides by lines per page. Good enough for
 * the live toolbar indicator; real pagination comes with PDF export.
 */
export function estimateRuntime(elements: ScriptElement[]): RuntimeEstimate {
  let totalLines = 0;
  for (const el of elements) {
    totalLines +=
      LEADING_BLANKS[el.type] + wrappedLines(el.text, COLUMN_WIDTH[el.type]);
  }

  const pages = totalLines / LINES_PER_PAGE;
  const eighths = Math.round(pages * 8);
  const whole = Math.floor(eighths / 8);
  const frac = eighths % 8;
  let pagesLabel: string;
  if (eighths === 0) {
    pagesLabel = "0";
  } else if (whole === 0) {
    pagesLabel = `${frac}/8`;
  } else {
    pagesLabel = `${whole}${frac ? ` ${frac}/8` : ""}`;
  }
  const minutes = pages > 0 ? Math.max(1, Math.round(pages)) : 0;

  return { pages, pagesLabel, minutes };
}
