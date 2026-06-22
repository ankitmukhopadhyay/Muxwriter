import type { ScriptElement } from "./fountain";

/**
 * Find and replace across the structured script.
 *
 * Search runs over each element's raw text (what the writer sees and edits),
 * so a single match never spans element boundaries. Matches are returned in
 * document order with their element id and character range, which the editor
 * uses to focus the element and select the hit.
 */

export interface Match {
  elementId: string;
  start: number;
  end: number;
}

/** All non overlapping occurrences of `query` within a single string. */
function indicesIn(text: string, query: string, matchCase: boolean): number[] {
  if (!query) return [];
  const hay = matchCase ? text : text.toLowerCase();
  const needle = matchCase ? query : query.toLowerCase();
  const out: number[] = [];
  let from = 0;
  for (;;) {
    const i = hay.indexOf(needle, from);
    if (i === -1) break;
    out.push(i);
    from = i + needle.length;
  }
  return out;
}

/** Every match of `query` across the elements, in document order. */
export function findMatches(
  elements: ScriptElement[],
  query: string,
  matchCase: boolean,
): Match[] {
  const matches: Match[] = [];
  for (const el of elements) {
    for (const start of indicesIn(el.text, query, matchCase)) {
      matches.push({ elementId: el.id, start, end: start + query.length });
    }
  }
  return matches;
}

/**
 * Replaces a single occurrence at a known range in one element, returning the
 * new element list. The range must come from a current `findMatches` result.
 */
export function replaceMatch(
  elements: ScriptElement[],
  match: Match,
  replacement: string,
): ScriptElement[] {
  return elements.map((el) =>
    el.id === match.elementId
      ? {
          ...el,
          text: el.text.slice(0, match.start) + replacement + el.text.slice(match.end),
        }
      : el,
  );
}

/**
 * Replaces every occurrence of `query` across all elements. Returns the new
 * element list and how many replacements were made.
 */
export function replaceAll(
  elements: ScriptElement[],
  query: string,
  replacement: string,
  matchCase: boolean,
): { elements: ScriptElement[]; count: number } {
  if (!query) return { elements, count: 0 };
  let count = 0;
  const next = elements.map((el) => {
    const positions = indicesIn(el.text, query, matchCase);
    if (positions.length === 0) return el;
    count += positions.length;
    // Rebuild the string left to right so replacement text is never rescanned.
    let result = "";
    let cursor = 0;
    for (const i of positions) {
      result += el.text.slice(cursor, i) + replacement;
      cursor = i + query.length;
    }
    result += el.text.slice(cursor);
    return { ...el, text: result };
  });
  return { elements: next, count };
}
