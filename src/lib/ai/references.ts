import {
  deriveScenes,
  elementsToFountain,
  type ScriptElement,
} from "../fountain";
import type { EditorSelection } from "../../components/editor/Editor";

/**
 * Helpers for Cursor style @ mentions, highlight to ask context bundling, and
 * the data behind the mention autocomplete. Scenes and characters are the
 * stable, addressable units the writer can pull explicitly into context.
 */

export interface Mentionable {
  kind: "scene" | "character";
  /** The token inserted into the composer, e.g. "@Scene 3" or "@MAYA". */
  token: string;
  /** Human label for the menu. */
  label: string;
}

export function getMentionables(elements: ScriptElement[]): Mentionable[] {
  const scenes = deriveScenes(elements);
  const items: Mentionable[] = scenes.map((s) => ({
    kind: "scene",
    token: `@Scene ${s.index}`,
    label: `Scene ${s.index}: ${s.heading || "(untitled)"}`,
  }));

  const characters = new Set<string>();
  for (const el of elements) {
    if (el.type === "character") {
      const name = el.text.trim().toUpperCase().replace(/\s*\(.*\)$/, "");
      if (name) characters.add(name);
    }
  }
  for (const name of characters) {
    items.push({ kind: "character", token: `@${name}`, label: name });
  }
  return items;
}

/**
 * Builds the extra, per turn context block from the highlighted selection and
 * any @ mentions in the user's message. Returned text is appended to the
 * system prompt for that single turn so the cost only applies when relevant.
 */
export function buildTurnContext(
  elements: ScriptElement[],
  userText: string,
  selection: EditorSelection | null,
): string {
  const scenes = deriveScenes(elements);
  const parts: string[] = [];

  if (selection) {
    parts.push(
      `The writer has highlighted this text in Scene ${selection.sceneIndex} (${selection.heading}):\n"${selection.text}"`,
    );
  }

  // @Scene N mentions: include that scene in full.
  const sceneMentions = new Set<number>();
  for (const m of userText.matchAll(/@Scene\s+(\d+)/gi)) {
    sceneMentions.add(Number(m[1]));
  }
  for (const index of sceneMentions) {
    const scene = scenes.find((s) => s.index === index);
    if (!scene) continue;
    const body = elementsToFountain(
      elements.filter((el) => scene.elementIds.includes(el.id)),
    ).trim();
    parts.push(`Referenced Scene ${index} (${scene.heading}):\n${body}`);
  }

  // @CHARACTER mentions: note where the character appears.
  for (const m of userText.matchAll(/@([A-Z][A-Z0-9'_]+)/g)) {
    const name = m[1].toUpperCase();
    const inScenes = scenes
      .filter((s) => s.characters.includes(name))
      .map((s) => s.index);
    if (inScenes.length) {
      parts.push(
        `Referenced character ${name} appears in scenes: ${inScenes.join(", ")}.`,
      );
    }
  }

  return parts.length ? `# Referenced by the writer this turn\n${parts.join("\n\n")}` : "";
}

/**
 * Splits assistant reply text into plain segments and clickable scene
 * citations ("Scene N"), so the UI can render the citations as jump links.
 */
export type ReplySegment =
  | { type: "text"; text: string }
  | { type: "scene"; index: number; text: string };

export function parseCitations(reply: string): ReplySegment[] {
  const segments: ReplySegment[] = [];
  const regex = /Scene\s+(\d+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(reply)) !== null) {
    if (match.index > last) {
      segments.push({ type: "text", text: reply.slice(last, match.index) });
    }
    segments.push({
      type: "scene",
      index: Number(match[1]),
      text: match[0],
    });
    last = match.index + match[0].length;
  }
  if (last < reply.length) {
    segments.push({ type: "text", text: reply.slice(last) });
  }
  return segments;
}
