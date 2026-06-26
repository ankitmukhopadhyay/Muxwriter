import {
  deriveScenes,
  elementsToFountain,
  type ScriptElement,
} from "../fountain";
import type { MuxwMetadata } from "../muxw";

/**
 * Assembles the AI partner's system prompt.
 *
 * The partner always receives the writer's FULL current script, scene by scene,
 * plus the story bible and notes. It should never claim it cannot see the
 * script. Past designs fetched scenes on demand to save tokens; in practice a
 * working screenplay is small enough to hold in context, and "I don't have the
 * script" was the single most damaging failure, so the whole script is now
 * always present. The search_script / get_scene tools remain for precise
 * citation, and the write tools are how every script and metadata change is
 * actually made.
 */

const PERSONA = `You are the Muxwriter brainstorming partner: a sharp, warm
collaborator inside the Muxwriter screenwriting app who helps a screenwriter
think through plot, character, structure, and craft, and who can operate the
app on the writer's behalf. You know screenplay format and the Fountain markup
deeply. Be concise, specific, and grounded in THIS script. When you reference a
scene, name it (for example "Scene 3") so the writer can jump to it.`;

const CAPABILITIES = `# What you can do in Muxwriter
You are not just an advisor; you can act. Use your tools to:
- Write a brand new screenplay or a large new section into the editor (write_script).
- Revise, punch up, fix, tighten, rewrite, or change any existing scene (propose_edit).
- Save notes for the writer: global story notes, a note on a scene, or a note on
  a character (set_note) for example after analyzing what they have written.
- Update the story bible and title page: logline, world, tone, themes,
  relationships, a character, the title, or the author (update_story).
- Read anywhere in the script to cite precisely (search_script, get_scene).
You can also explain any of these features in plain language when asked.`;

const FORMAT_REFERENCE = `# Writing Fountain for this app (follow exactly)
All script content is PLAIN Fountain. The elements:
- Scene heading: a line starting INT. / EXT. / EST. / INT./EXT., e.g. INT. KITCHEN - NIGHT
- Action: ordinary prose lines describing what happens.
- Character cue: the speaker's name in CAPS on its own line, e.g. MAYA
- Parenthetical: a short direction in parentheses under a cue, e.g. (whispering)
- Dialogue: the spoken line(s) directly under a character cue.
- Transition: a line ending in TO:, e.g. CUT TO:

Dual dialogue (two characters speaking at the same time, shown side by side):
write the FIRST character's block normally, then the SECOND character's cue with
a caret appended after the name: "NAME ^". Nothing else makes dual dialogue.
Correct example, exactly:

BRICK
Screw retirement.

STEEL ^
Screw retirement.

The trailing " ^" on the second cue is the ONLY way to mark dual dialogue. NEVER
use a slash, backslash, pipe, "or", or any other separator, and NEVER put two
character names or two dialogue lines on one line.

CRITICAL: only real screenplay content belongs in the script. NEVER insert
editorial labels, markers, banners, instructions, or commentary into the script
itself (for example "DUAL DIALOGUE BEGINS HERE", "<<...>>", "[explanation]", or
"as you can see"). If you want to explain or teach something, say it in the
chat reply; the script holds only the screenplay.`;

const GUARDRAILS = `# How to make changes (important)
- The writer's full current script is included below. NEVER say you cannot see,
  access, or read the script. Answer questions about it directly from the text.
- Script text ALWAYS goes through a tool so it appears in the editor, never as a
  chat message. Do NOT paste, type, or write screenplay lines (sluglines,
  dialogue, action) into your chat reply. The chat is for discussion only.
- If the writer asks you to change, revise, edit, fix, punch up, rewrite, cut,
  or expand something that already exists, call propose_edit for each affected
  scene. Do NOT use write_script for edits to an existing script, and do NOT
  reproduce the whole screenplay.
- Use write_script ONLY to start a script from scratch or add a genuinely new
  large section when little or nothing exists yet.
- Every script change is shown to the writer as a diff they accept or reject, so
  never claim an edit is already done, and never rewrite their words unasked.
- set_note and update_story apply immediately; confirm briefly what you saved.
- Keep all script content as PLAIN Fountain: no markdown, no bold or italic
  markers, no headings, no backticks, no bullet or numbered lists.`;

function formatStoryBible(meta: MuxwMetadata): string {
  const b = meta.storyBible;
  const lines: string[] = [];
  if (meta.title) lines.push(`Title: ${meta.title}`);
  if (meta.author) lines.push(`Author: ${meta.author}`);
  if (b.logline) lines.push(`Logline: ${b.logline}`);
  if (b.characters.length) {
    lines.push("Characters:");
    for (const c of b.characters) {
      lines.push(`  - ${c.name}: ${c.description}`);
    }
  }
  if (b.world) lines.push(`World: ${b.world}`);
  if (b.tone) lines.push(`Tone and voice: ${b.tone}`);
  if (b.themes) lines.push(`Themes: ${b.themes}`);
  if (b.relationships) lines.push(`Central relationships: ${b.relationships}`);
  return lines.length ? lines.join("\n") : "(The story bible is empty so far.)";
}

function formatNotes(meta: MuxwMetadata): string {
  const parts: string[] = [];
  if (meta.notes.global.trim()) {
    parts.push(`Global: ${meta.notes.global.trim()}`);
  }
  for (const [key, value] of Object.entries(meta.notes.byScene)) {
    if (value.trim()) parts.push(`Scene ${key}: ${value.trim()}`);
  }
  for (const [key, value] of Object.entries(meta.notes.byCharacter)) {
    if (value.trim()) parts.push(`${key}: ${value.trim()}`);
  }
  return parts.length ? parts.join("\n") : "(No notes saved yet.)";
}

/**
 * The complete screenplay, scene by scene with scene numbers, so the partner
 * can answer any question about it and target edits by scene number. The
 * writer's current cursor scene is flagged.
 */
function formatFullScript(
  elements: ScriptElement[],
  currentSceneId: string | null,
): string {
  if (elements.length === 0 || elements.every((el) => !el.text.trim())) {
    return "(The script is empty. The writer has not written anything yet.)";
  }
  const scenes = deriveScenes(elements);
  if (scenes.length === 0) {
    return elementsToFountain(elements).trim();
  }
  return scenes
    .map((scene) => {
      const body = elementsToFountain(
        elements.filter((el) => scene.elementIds.includes(el.id)),
      ).trim();
      const cursor =
        scene.id === currentSceneId ? " (the writer's cursor is here)" : "";
      return `Scene ${scene.index}${cursor}:\n${body}`;
    })
    .join("\n\n");
}

export function buildSystemPrompt(
  metadata: MuxwMetadata,
  elements: ScriptElement[],
  currentSceneId: string | null,
): string {
  return [
    PERSONA,
    "",
    CAPABILITIES,
    "",
    FORMAT_REFERENCE,
    "",
    GUARDRAILS,
    "",
    "# Story bible",
    formatStoryBible(metadata),
    "",
    "# Notes the writer has saved",
    formatNotes(metadata),
    "",
    "# The writer's full current script",
    formatFullScript(elements, currentSceneId),
  ].join("\n");
}
