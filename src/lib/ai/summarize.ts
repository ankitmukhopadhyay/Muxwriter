import {
  deriveScenes,
  elementsToFountain,
  type ScriptElement,
} from "../fountain";
import type { MuxwMetadata, SceneLogEntry } from "../muxw";
import { activeKey, type AppSettings } from "../settings";
import { makeClient } from "./client";

/** Summarize at most this many scenes per run to bound latency and cost. */
const MAX_PER_RUN = 3;

const SUMMARIZE_SYSTEM = `You compress a screenplay scene into a one or two
sentence summary for a running story log: the key plot beats, plus any
character or world detail worth remembering later. Output only the summary,
with no preamble.`;

/**
 * Summarizes completed scenes (every scene except the one currently being
 * written) that are not yet in the rolling log, and returns updated metadata.
 * Returns null when there is nothing to do or no Anthropic key is configured.
 * This grows the log slowly so AI context cost stays flat as the script grows.
 */
export async function summarizeCompletedScenes(
  settings: AppSettings,
  metadata: MuxwMetadata,
  elements: ScriptElement[],
): Promise<MuxwMetadata | null> {
  if (settings.provider !== "anthropic" || !activeKey(settings)) return null;

  const scenes = deriveScenes(elements);
  if (scenes.length <= 1) return null;

  const completed = scenes.slice(0, -1); // exclude the current (last) scene
  const logged = new Set(
    metadata.sceneLog.map((e) => `${e.index}:${e.heading}`),
  );
  const missing = completed
    .filter((s) => !logged.has(`${s.index}:${s.heading}`))
    .slice(0, MAX_PER_RUN);
  if (!missing.length) return null;

  const client = makeClient(settings);

  const summaries = await Promise.all(
    missing.map(async (scene): Promise<SceneLogEntry> => {
      const body = elementsToFountain(
        elements.filter((el) => scene.elementIds.includes(el.id)),
      ).trim();
      const response = await client.messages.create({
        model: settings.model,
        max_tokens: 256,
        system: SUMMARIZE_SYSTEM,
        messages: [{ role: "user", content: body }],
      });
      const summary = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join(" ")
        .trim();
      return { index: scene.index, heading: scene.heading, summary };
    }),
  );

  const merged = new Map(metadata.sceneLog.map((e) => [e.index, e]));
  for (const entry of summaries) merged.set(entry.index, entry);
  const sceneLog = Array.from(merged.values()).sort(
    (a, b) => a.index - b.index,
  );

  return { ...metadata, sceneLog };
}
