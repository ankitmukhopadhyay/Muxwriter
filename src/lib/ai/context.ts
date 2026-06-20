import {
  deriveScenes,
  elementsToFountain,
  type ScriptElement,
} from "../fountain";
import type { MuxwMetadata } from "../muxw";

/**
 * Assembles the AI partner's system prompt from the cost controlled context
 * architecture: a persistent story bible, a rolling summary of completed
 * scenes, and the current scene in full. Past scenes are intentionally NOT
 * preloaded here; in Phase 4 the model fetches them on demand via tools.
 */

const PERSONA = `You are the Muxwriter brainstorming partner: a sharp, warm
collaborator who helps a screenwriter think through plot, character, structure,
and craft. You know screenplay format deeply. You are grounded in THIS script,
not generic advice. Be concise and specific. When you reference a scene, name
it (for example "Scene 3" or the slugline) so the writer can jump to it. Never
rewrite the writer's words unless they explicitly ask; when they do, propose
the change rather than asserting it.`;

function formatStoryBible(meta: MuxwMetadata): string {
  const b = meta.storyBible;
  const lines: string[] = [];
  if (meta.title) lines.push(`Title: ${meta.title}`);
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

function formatSceneLog(meta: MuxwMetadata): string {
  if (!meta.sceneLog.length) {
    return "(No earlier scenes have been summarized yet.)";
  }
  return meta.sceneLog
    .map((e) => `Scene ${e.index} (${e.heading}): ${e.summary}`)
    .join("\n");
}

function formatCurrentScene(
  elements: ScriptElement[],
  currentSceneId: string | null,
): string {
  const scenes = deriveScenes(elements);
  const scene =
    scenes.find((s) => s.id === currentSceneId) ?? scenes[scenes.length - 1];
  if (!scene) return "(The script is empty.)";
  const sceneElements = elements.filter((el) =>
    scene.elementIds.includes(el.id),
  );
  const header = `Scene ${scene.index}: ${scene.heading || "(untitled)"}`;
  return `${header}\n\n${elementsToFountain(sceneElements).trim()}`;
}

export function buildSystemPrompt(
  metadata: MuxwMetadata,
  elements: ScriptElement[],
  currentSceneId: string | null,
): string {
  return [
    PERSONA,
    "",
    "# Story bible",
    formatStoryBible(metadata),
    "",
    "# Summary of earlier scenes",
    formatSceneLog(metadata),
    "",
    "# Current scene (full detail)",
    formatCurrentScene(elements, currentSceneId),
  ].join("\n");
}
