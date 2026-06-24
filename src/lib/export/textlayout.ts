import type { ElementType, ScriptElement } from "../fountain";

/**
 * Shared plain text screenplay geometry, in character columns, used by the
 * plain text export. Standard screenplay indents on a 60 column page.
 */

const INDENT: Record<ElementType, number> = {
  scene_heading: 0,
  action: 0,
  character: 20,
  parenthetical: 15,
  dialogue: 10,
  transition: 0,
};

const WRAP: Record<ElementType, number> = {
  scene_heading: 58,
  action: 58,
  character: 38,
  parenthetical: 25,
  dialogue: 35,
  transition: 58,
};

const PAGE_WIDTH = 60;

function format(type: ElementType, raw: string): string {
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
      return text;
  }
}

/** Greedy word wrap to a column width. */
export function wrap(text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + 1 + word.length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function isDialogueInner(type: ElementType): boolean {
  return type === "parenthetical" || type === "dialogue";
}

/** Renders the script to plain monospaced screenplay text. */
export function scriptToText(elements: ScriptElement[]): string {
  const out: string[] = [];
  let prevType: ElementType | null = null;

  for (const el of elements) {
    const contiguous =
      isDialogueInner(el.type) &&
      (prevType === "character" ||
        prevType === "parenthetical" ||
        prevType === "dialogue");
    if (out.length > 0 && !contiguous) {
      out.push(el.type === "scene_heading" ? "" : "");
    }

    const text = format(el.type, el.text);
    for (const line of wrap(text, WRAP[el.type])) {
      if (el.type === "transition") {
        const pad = Math.max(0, PAGE_WIDTH - line.length);
        out.push(" ".repeat(pad) + line);
      } else {
        out.push(" ".repeat(INDENT[el.type]) + line);
      }
    }
    prevType = el.type;
  }
  return out.join("\n") + "\n";
}
