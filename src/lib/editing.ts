import {
  deriveScenes,
  elementsToFountain,
  fountainToElements,
  type ScriptElement,
} from "./fountain";

/**
 * AI proposed edits and the diff that renders them. The partner never changes
 * the script silently: an edit is proposed as a scene level replacement and
 * shown as a diff the writer explicitly accepts or rejects, preserving their
 * voice and trust.
 */

export interface ProposedEdit {
  id: string;
  /** "scene" replaces one scene; "script" writes/replaces the whole script. */
  scope: "scene" | "script";
  sceneIndex: number;
  heading: string;
  oldText: string;
  newText: string;
  note: string;
}

export type DiffLineType = "same" | "added" | "removed";
export interface DiffLine {
  type: DiffLineType;
  text: string;
}

/** Line level diff (LCS) for rendering the old and new scene text. */
export function lineDiff(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] =
        a[i] === b[j]
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "removed", text: a[i] });
      i++;
    } else {
      out.push({ type: "added", text: b[j] });
      j++;
    }
  }
  while (i < m) out.push({ type: "removed", text: a[i++] });
  while (j < n) out.push({ type: "added", text: b[j++] });
  return out;
}

/**
 * Builds a ProposedEdit from a propose_edit tool call, resolving the target
 * scene and capturing its current text. Returns null when the scene cannot be
 * found or the replacement is empty.
 */
export function buildProposedEdit(
  elements: ScriptElement[],
  input: Record<string, unknown>,
): ProposedEdit | null {
  const scenes = deriveScenes(elements);
  let scene =
    typeof input.scene_id === "string"
      ? scenes.find((s) => s.id === input.scene_id)
      : undefined;
  if (!scene && typeof input.scene_number === "number") {
    scene = scenes.find((s) => s.index === input.scene_number);
  }
  if (!scene) return null;

  const newText = String(input.new_text ?? "").trim();
  if (!newText) return null;

  const oldText = elementsToFountain(
    elements.filter((el) => scene!.elementIds.includes(el.id)),
  ).trim();

  return {
    id: newId(),
    scope: "scene",
    sceneIndex: scene.index,
    heading: scene.heading,
    oldText,
    newText,
    note: typeof input.note === "string" ? input.note : "",
  };
}

function newId(): string {
  return `edit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Builds a whole script proposal from a write_script tool call: the AI's draft
 * replaces the entire screenplay, shown as a diff against the current script.
 */
export function buildScriptProposal(
  elements: ScriptElement[],
  input: Record<string, unknown>,
): ProposedEdit | null {
  const newText = String(input.content ?? input.new_text ?? "").trim();
  if (!newText) return null;
  return {
    id: newId(),
    scope: "script",
    sceneIndex: 0,
    heading: "",
    oldText: elementsToFountain(elements).trim(),
    newText,
    note: typeof input.note === "string" ? input.note : "",
  };
}

/** Applies an accepted edit, replacing the target scene or the whole script. */
export function applyProposedEdit(
  elements: ScriptElement[],
  edit: ProposedEdit,
): ScriptElement[] {
  if (edit.scope === "script") {
    return fountainToElements(edit.newText);
  }
  const scene = deriveScenes(elements).find((s) => s.index === edit.sceneIndex);
  if (!scene) return elements;
  const firstIdx = elements.findIndex((e) => e.id === scene.elementIds[0]);
  const lastId = scene.elementIds[scene.elementIds.length - 1];
  const lastIdx = elements.findIndex((e) => e.id === lastId);
  if (firstIdx === -1 || lastIdx === -1) return elements;

  const replacement = fountainToElements(edit.newText);
  const next = [...elements];
  next.splice(firstIdx, lastIdx - firstIdx + 1, ...replacement);
  return next;
}
