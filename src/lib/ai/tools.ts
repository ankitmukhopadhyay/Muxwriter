import type Anthropic from "@anthropic-ai/sdk";
import {
  deriveScenes,
  elementsToFountain,
  type ScriptElement,
} from "../fountain";
import {
  buildProposedEdit,
  buildScriptProposal,
  type ProposedEdit,
} from "../editing";

/**
 * Agentic tools the model invokes itself when a reference points outside the
 * current scene. This is the cost minimizing pattern: cost scales with what is
 * relevant per turn, not the whole script length. Both tools read from the
 * same structured element model the rest of the app uses, and their results
 * carry scene ids so replies can cite and link back.
 */

export const TOOLS: Anthropic.Tool[] = [
  {
    name: "search_script",
    description:
      "Search the entire screenplay for a phrase or keyword. Returns the matching scenes with their scene id, scene number, slugline, and a short snippet. Use this when the writer references a character, location, or moment that is not in the current scene.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Text or keyword to search for (case insensitive).",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_scene",
    description:
      "Fetch the full text of one scene, by its scene id (from search_script) or by its 1 based scene number. Use this to read a specific past scene in detail before answering.",
    input_schema: {
      type: "object",
      properties: {
        scene_id: { type: "string", description: "The scene id to fetch." },
        scene_number: {
          type: "number",
          description: "The 1 based scene number to fetch.",
        },
      },
    },
  },
  {
    name: "write_script",
    description:
      "Write a screenplay draft directly into the editor when the writer asks you to write, draft, or generate a script or a large new section. Provide the screenplay as PLAIN Fountain text in `content` (scene headings like INT./EXT., character cues in caps, dialogue, parentheticals, transitions). Do NOT use any markdown: no **, no #, no backticks, no bullet or numbered lists. The draft is shown to the writer as a diff to accept or reject. Use this instead of pasting a screenplay into the chat.",
    input_schema: {
      type: "object",
      properties: {
        content: {
          type: "string",
          description: "The full screenplay draft as Fountain text.",
        },
        note: {
          type: "string",
          description: "A one line note on what you wrote.",
        },
      },
      required: ["content"],
    },
  },
  {
    name: "propose_edit",
    description:
      "Propose a revision to a whole scene when the writer asks you to change the script. Provide the full rewritten scene as PLAIN Fountain text (no markdown: no **, no #, no backticks, no lists). The change is shown to the writer as a diff to accept or reject; it is never applied silently. Only use this when the writer explicitly asks for an edit.",
    input_schema: {
      type: "object",
      properties: {
        scene_number: {
          type: "number",
          description: "The 1 based scene number to revise.",
        },
        scene_id: { type: "string", description: "The scene id to revise." },
        new_text: {
          type: "string",
          description: "The full rewritten scene as Fountain text.",
        },
        note: {
          type: "string",
          description: "A one line note on what the revision changes and why.",
        },
      },
      required: ["new_text"],
    },
  },
];

function sceneText(elements: ScriptElement[], elementIds: string[]): string {
  const subset = elements.filter((el) => elementIds.includes(el.id));
  return elementsToFountain(subset).trim();
}

/**
 * Executes a tool call against the current script and returns a string result
 * for the model. Unknown tools and misses return readable messages rather than
 * throwing, so the conversation loop stays robust.
 */
export function runTool(
  name: string,
  input: Record<string, unknown>,
  elements: ScriptElement[],
): string {
  const scenes = deriveScenes(elements);

  if (name === "search_script") {
    const query = String(input.query ?? "").trim().toLowerCase();
    if (!query) return "No query provided.";
    const hits = scenes.filter((scene) =>
      scene.elementIds.some((id) => {
        const el = elements.find((e) => e.id === id);
        return el?.text.toLowerCase().includes(query);
      }),
    );
    if (!hits.length) return `No scenes match "${input.query}".`;
    return hits
      .map((scene) => {
        const body = sceneText(elements, scene.elementIds);
        const idx = body.toLowerCase().indexOf(query);
        const start = Math.max(0, idx - 40);
        const snippet = body.slice(start, start + 120).replace(/\n/g, " ");
        return `[scene_id: ${scene.id}] Scene ${scene.index}: ${
          scene.heading || "(untitled)"
        }\n  …${snippet}…`;
      })
      .join("\n\n");
  }

  if (name === "write_script" || name === "propose_edit") {
    return "This tool proposes a change and is handled separately.";
  }

  if (name === "get_scene") {
    let scene = null;
    if (typeof input.scene_id === "string") {
      scene = scenes.find((s) => s.id === input.scene_id) ?? null;
    }
    if (!scene && typeof input.scene_number === "number") {
      scene = scenes.find((s) => s.index === input.scene_number) ?? null;
    }
    if (!scene) return "Scene not found.";
    return `Scene ${scene.index}: ${scene.heading || "(untitled)"}\n\n${sceneText(
      elements,
      scene.elementIds,
    )}`;
  }

  return `Unknown tool: ${name}`;
}

/**
 * Dispatches any tool call. The proposal tools (write_script, propose_edit)
 * register a diff for the writer to accept or reject and never change the
 * script silently; everything else is a read only script query.
 */
export function handleToolCall(
  name: string,
  input: Record<string, unknown>,
  elements: ScriptElement[],
  onProposeEdit?: (edit: ProposedEdit) => void,
): string {
  if (name === "write_script") {
    const edit = buildScriptProposal(elements, input);
    if (edit && onProposeEdit) {
      onProposeEdit(edit);
      return "Wrote a draft into the editor as a proposed change. The writer will accept or reject it.";
    }
    return "Could not build the draft.";
  }
  if (name === "propose_edit") {
    const edit = buildProposedEdit(elements, input);
    if (edit && onProposeEdit) {
      onProposeEdit(edit);
      return `Proposed a revision to Scene ${edit.sceneIndex}. The writer will accept or reject it in the editor.`;
    }
    return "Could not locate that scene to edit.";
  }
  return runTool(name, input, elements);
}
