import type { ElementType, ScriptElement } from "./types";

/**
 * SmartType: the autocomplete every professional screenwriting tool has.
 * Suggests scene intros (INT./EXT.), reused locations and times of day,
 * character names from the cast, and standard transitions, so the writer
 * never retypes the same name or fights the formatting.
 */

const INTROS = ["INT.", "EXT.", "EST.", "INT./EXT.", "I/E."];

const TIMES = [
  "DAY",
  "NIGHT",
  "MORNING",
  "AFTERNOON",
  "EVENING",
  "DAWN",
  "DUSK",
  "CONTINUOUS",
  "LATER",
  "MOMENTS LATER",
  "SAME TIME",
];

const TRANSITIONS = [
  "CUT TO:",
  "DISSOLVE TO:",
  "SMASH CUT TO:",
  "MATCH CUT TO:",
  "JUMP CUT TO:",
  "INTERCUT WITH:",
  "FADE OUT.",
  "FADE TO BLACK.",
  "FADE IN:",
];

function distinct(
  elements: ScriptElement[],
  type: ElementType,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const el of elements) {
    if (el.type !== type) continue;
    const value = el.text.trim().toUpperCase();
    if (value && !seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/**
 * Suggestions for the focused element, given its current text. The returned
 * strings are the full replacement values; an empty list means no autocomplete.
 */
export function getSuggestions(
  type: ElementType,
  text: string,
  elements: ScriptElement[],
): string[] {
  const upper = text.trim().toUpperCase();

  if (type === "character") {
    const cast = distinct(elements, "character");
    const matches = upper
      ? cast.filter((n) => n.startsWith(upper) && n !== upper)
      : cast;
    return matches.slice(0, 6);
  }

  if (type === "transition") {
    const matches = upper
      ? TRANSITIONS.filter((x) => x.startsWith(upper) && x !== upper)
      : TRANSITIONS;
    return matches.slice(0, 6);
  }

  if (type === "scene_heading") {
    // After the " - " separator, complete the time of day.
    const dash = upper.lastIndexOf(" - ");
    if (dash !== -1) {
      const head = upper.slice(0, dash + 3);
      const partial = upper.slice(dash + 3);
      const times = TIMES.filter(
        (t) => t.startsWith(partial) && t !== partial,
      ).map((t) => head + t);
      if (times.length) return times.slice(0, 6);
    }

    if (!upper) return INTROS.map((i) => `${i} `);

    const intros = INTROS.filter(
      (i) => i.startsWith(upper) && i !== upper,
    ).map((i) => `${i} `);
    const headings = distinct(elements, "scene_heading").filter(
      (h) => h.startsWith(upper) && h !== upper,
    );
    return [...intros, ...headings].slice(0, 6);
  }

  return [];
}

/**
 * True if an action line has started typing a scene heading. Accepts the
 * common intros with or without the trailing dot (writers often type "INT "),
 * but not words like "Internal" that merely begin with the letters.
 */
export function looksLikeSceneHeading(text: string): boolean {
  return /^\s*(INT\.?\/EXT\.?|EXT\.?\/INT\.?|INT|EXT|EST|I\/E)\.?[ \t]/i.test(
    text,
  );
}
