import type { ElementType, ScriptElement } from "./types";

/**
 * Formats a single element's text the way Fountain expects it on the page.
 * Scene headings, character cues, and transitions are uppercased;
 * parentheticals are wrapped in parentheses.
 */
function formatText(type: ElementType, raw: string): string {
  const text = raw.trim();
  switch (type) {
    case "scene_heading":
    case "character":
    case "transition":
      return text.toUpperCase();
    case "parenthetical": {
      const inner = text.replace(/^\(+|\)+$/g, "").trim();
      return `(${inner})`;
    }
    default:
      return raw;
  }
}

/** True for the element types that sit inside a contiguous dialogue block. */
function isDialogueInner(type: ElementType): boolean {
  return type === "parenthetical" || type === "dialogue";
}

/**
 * Serializes the element list to Fountain text.
 *
 * The key rule: elements are separated by a blank line, EXCEPT the lines of a
 * dialogue block (character cue, parentheticals, dialogue) which stay
 * contiguous with no blank lines between them. That blank line discipline is
 * what lets a Fountain parser recover the same structure on load.
 */
export function elementsToFountain(elements: ScriptElement[]): string {
  const lines: string[] = [];
  let prevType: ElementType | null = null;

  for (const el of elements) {
    const text = formatText(el.type, el.text);
    const contiguous =
      isDialogueInner(el.type) &&
      (prevType === "character" ||
        prevType === "parenthetical" ||
        prevType === "dialogue");

    if (lines.length > 0 && !contiguous) {
      lines.push("");
    }
    lines.push(text);
    prevType = el.type;
  }

  return lines.join("\n") + "\n";
}
