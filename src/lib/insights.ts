import { deriveScenes, type ScriptElement } from "./fountain";
import type { Scene } from "./fountain";

/**
 * Reports derived for free from the same structured element model the Fountain
 * parser produces for formatting. No separate extraction system: character and
 * scene breakdowns read the same scenes everything else does.
 */

export interface CharacterStat {
  name: string;
  /** Number of dialogue blocks spoken by this character. */
  lines: number;
  /** Number of distinct scenes the character appears in. */
  scenes: number;
}

function normalizeName(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s*\(.*\)$/, "");
}

/** Character breakdown: dialogue line counts and scene appearances. */
export function characterBreakdown(elements: ScriptElement[]): CharacterStat[] {
  const lineCounts = new Map<string, number>();
  let current: string | null = null;
  for (const el of elements) {
    if (el.type === "character") {
      current = normalizeName(el.text);
    } else if (el.type === "dialogue" && current) {
      lineCounts.set(current, (lineCounts.get(current) ?? 0) + 1);
    } else if (
      el.type === "scene_heading" ||
      el.type === "action" ||
      el.type === "transition"
    ) {
      // A new cue is required after these, so the speaker context resets.
      current = null;
    }
  }

  const sceneCounts = new Map<string, number>();
  for (const scene of deriveScenes(elements)) {
    for (const name of scene.characters) {
      sceneCounts.set(name, (sceneCounts.get(name) ?? 0) + 1);
    }
  }

  const names = new Set<string>([...lineCounts.keys(), ...sceneCounts.keys()]);
  return [...names]
    .map((name) => ({
      name,
      lines: lineCounts.get(name) ?? 0,
      scenes: sceneCounts.get(name) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.lines - a.lines ||
        b.scenes - a.scenes ||
        a.name.localeCompare(b.name),
    );
}

/** Scene breakdown: INT/EXT, time of day, and location per scene. */
export function sceneBreakdown(elements: ScriptElement[]): Scene[] {
  return deriveScenes(elements);
}

export interface LocationStat {
  location: string;
  count: number;
}

/** Distinct locations and how many scenes use each. */
export function locationBreakdown(elements: ScriptElement[]): LocationStat[] {
  const counts = new Map<string, number>();
  for (const scene of deriveScenes(elements)) {
    const loc = scene.location || "(unspecified)";
    counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([location, count]) => ({ location, count }))
    .sort((a, b) => b.count - a.count || a.location.localeCompare(b.location));
}
