import type { ScriptElement } from "./types";

export type SceneEnvironment = "INT" | "EXT" | "INT/EXT" | "OTHER";

export interface Scene {
  /** Stable id: the id of the scene heading element that opens the scene. */
  id: string;
  /** 1 based position among scenes, recomputed on each derive. */
  index: number;
  /** Raw heading text, e.g. "INT. KITCHEN - NIGHT". */
  heading: string;
  environment: SceneEnvironment;
  /** Location portion of the heading, e.g. "KITCHEN". */
  location: string;
  /** Time of day portion, e.g. "NIGHT". */
  timeOfDay: string;
  /** Ids of every element in the scene, including the heading itself. */
  elementIds: string[];
  /** Distinct character cue names appearing in the scene, in order. */
  characters: string[];
}

function parseHeading(heading: string): Pick<
  Scene,
  "environment" | "location" | "timeOfDay"
> {
  const text = heading.trim();
  let environment: SceneEnvironment = "OTHER";
  const upper = text.toUpperCase();
  if (/^(INT\.?\/EXT\.?|EXT\.?\/INT\.?|I\/E)/.test(upper)) {
    environment = "INT/EXT";
  } else if (/^INT[.\s]/.test(upper) || upper === "INT") {
    environment = "INT";
  } else if (/^EXT[.\s]/.test(upper) || upper === "EXT") {
    environment = "EXT";
  }

  // Strip the leading environment prefix, then split location from time of day
  // on the last " - " separator (the conventional Fountain heading shape).
  const withoutEnv = text.replace(/^[A-Za-z./]+[.\s]+/, "");
  const dashIndex = withoutEnv.lastIndexOf(" - ");
  let location = withoutEnv;
  let timeOfDay = "";
  if (dashIndex !== -1) {
    location = withoutEnv.slice(0, dashIndex).trim();
    timeOfDay = withoutEnv.slice(dashIndex + 3).trim();
  }
  return { environment, location: location.trim(), timeOfDay };
}

/**
 * Groups the flat element list into scenes. A scene starts at each scene
 * heading; any elements before the first heading are gathered into a leading
 * scene with an empty heading so nothing is dropped.
 */
export function deriveScenes(elements: ScriptElement[]): Scene[] {
  const scenes: Scene[] = [];

  const startScene = (id: string, heading: string) => {
    scenes.push({
      id,
      index: scenes.length + 1,
      heading,
      elementIds: [],
      characters: [],
      ...parseHeading(heading),
    });
  };

  for (const el of elements) {
    if (el.type === "scene_heading") {
      startScene(el.id, el.text);
    } else if (scenes.length === 0) {
      // Content before the first heading: open an untitled scene.
      startScene(el.id, "");
    }

    const scene = scenes[scenes.length - 1];
    scene.elementIds.push(el.id);
    if (el.type === "character") {
      const name = el.text.trim().toUpperCase().replace(/\s*\(.*\)$/, "");
      if (name && !scene.characters.includes(name)) {
        scene.characters.push(name);
      }
    }
  }

  return scenes;
}
