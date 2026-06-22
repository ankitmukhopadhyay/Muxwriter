/**
 * The structured screenplay model.
 *
 * Fountain is the on disk serialization format, but the in memory source of
 * truth for the whole app is a flat, ordered list of typed `ScriptElement`s.
 * Formatting, export, insights, AI context, and the diff overlay all read
 * from this same structure. Scenes are derived from it (see `scenes.ts`) so
 * that they can be treated as stable, addressable units everywhere.
 */

/** The six core screenplay element types Muxwriter formats and cycles between. */
export type ElementType =
  | "scene_heading"
  | "action"
  | "character"
  | "parenthetical"
  | "dialogue"
  | "transition";

export interface ScriptElement {
  /** Stable identity, assigned on creation and preserved across edits. */
  id: string;
  type: ElementType;
  text: string;
  /**
   * Marks a character cue (and the dialogue block it begins) as the right hand
   * side of a dual, side by side dialogue. Only meaningful on `character`
   * elements; serialized as the trailing `^` Fountain uses for dual dialogue.
   */
  dual?: boolean;
}

/** Order used when cycling element types with Tab / Shift+Tab and in the rail. */
export const ELEMENT_CYCLE: ElementType[] = [
  "scene_heading",
  "action",
  "character",
  "parenthetical",
  "dialogue",
  "transition",
];

/** Human labels for the rail buttons and tooltips. */
export const ELEMENT_LABELS: Record<ElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};

/** Single character glyphs for the compact left rail. */
export const ELEMENT_GLYPHS: Record<ElementType, string> = {
  scene_heading: "S",
  action: "A",
  character: "C",
  parenthetical: "(",
  dialogue: "D",
  transition: "T",
};

let idCounter = 0;

/** Generates a process unique element id. */
export function newElementId(): string {
  idCounter += 1;
  return `el_${Date.now().toString(36)}_${idCounter.toString(36)}`;
}

export function makeElement(type: ElementType, text = ""): ScriptElement {
  return { id: newElementId(), type, text };
}

/**
 * The element type a fresh line should take when the writer presses Enter at
 * the end of an element of the given type. Mirrors normal screenplay flow:
 * a scene heading is followed by action, a character cue by dialogue, and so
 * on.
 */
export function nextTypeOnEnter(current: ElementType): ElementType {
  switch (current) {
    case "scene_heading":
      return "action";
    case "character":
      return "dialogue";
    case "parenthetical":
      return "dialogue";
    case "dialogue":
      return "action";
    case "transition":
      return "scene_heading";
    case "action":
    default:
      return "action";
  }
}

/**
 * The element types Tab should cycle through given what precedes this line.
 *
 * Mirrors how real screenwriting software adapts Tab to context: dialogue and
 * parenthetical are only offered inside a dialogue block (after a character
 * cue), never on a fresh line where no character has spoken yet. After a
 * character cue, Tab from the default dialogue lands on parenthetical, as a
 * writer expects.
 */
export function availableTypes(prevType: ElementType | null): ElementType[] {
  const inDialogue =
    prevType === "character" ||
    prevType === "parenthetical" ||
    prevType === "dialogue";
  return inDialogue
    ? ["dialogue", "parenthetical", "character", "action", "scene_heading", "transition"]
    : ["action", "character", "scene_heading", "transition"];
}

/**
 * Context aware Tab / Shift+Tab. Cycles within the types that make sense given
 * the previous element's type. If the current type is not valid in this
 * context, Tab snaps to the first sensible type.
 */
export function cycleType(
  current: ElementType,
  prevType: ElementType | null,
  backward = false,
): ElementType {
  const list = availableTypes(prevType);
  const i = list.indexOf(current);
  if (i === -1) return list[0];
  const len = list.length;
  const next = backward ? (i - 1 + len) % len : (i + 1) % len;
  return list[next];
}
