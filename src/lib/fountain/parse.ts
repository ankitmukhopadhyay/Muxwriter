import { Fountain } from "fountain-js";
import { type ElementType, type ScriptElement, makeElement } from "./types";

/**
 * Maps a fountain-js token type onto one of our six core element types.
 * Structural tokens (dialogue_begin/end, dual markers, spaces, page breaks,
 * title page, sections, synopses, notes) return null and are dropped. Less
 * common content tokens collapse onto the nearest core type so nothing is
 * lost as plain text.
 */
function mapTokenType(type: string): ElementType | null {
  switch (type) {
    case "scene_heading":
      return "scene_heading";
    case "character":
      return "character";
    case "parenthetical":
      return "parenthetical";
    case "dialogue":
      return "dialogue";
    case "transition":
      return "transition";
    case "action":
    case "centered":
    case "lyrics":
      return "action";
    default:
      return null;
  }
}

/** Decodes the HTML entities fountain-js emits in token text back to plain text. */
function decode(text: string | undefined): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

/**
 * Parses Fountain source text into the structured element list. Empty input
 * yields a single empty scene heading so the editor always has a place to
 * start typing.
 */
export function fountainToElements(source: string): ScriptElement[] {
  const trimmed = source.trim();
  if (!trimmed) {
    return [makeElement("scene_heading", "")];
  }

  const parsed = new Fountain().parse(trimmed, true);
  const elements: ScriptElement[] = [];

  for (const token of parsed.tokens) {
    const type = mapTokenType(token.type);
    if (!type) continue;
    let text = decode(token.text);
    // A forced transition may keep its leading ">" when it also ends in " TO:";
    // strip it so the editor shows clean transition text.
    if (type === "transition") text = text.replace(/^>\s*/, "").trim();
    elements.push(makeElement(type, text));
  }

  if (elements.length === 0) {
    return [makeElement("action", trimmed)];
  }
  return elements;
}
