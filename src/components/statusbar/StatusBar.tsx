import { useMemo } from "react";
import { deriveScenes, type ScriptElement } from "../../lib/fountain";
import "./statusbar.css";

interface StatusBarProps {
  elements: ScriptElement[];
  activeId: string | null;
}

function countWords(elements: ScriptElement[]): number {
  let total = 0;
  for (const el of elements) {
    const words = el.text.trim().split(/\s+/).filter(Boolean);
    total += words.length;
  }
  return total;
}

/**
 * A slim document status bar along the foot of the editor, the kind of at a
 * glance stat line professional screenwriting tools carry: where the cursor is,
 * how many scenes exist, and the running word count.
 */
export function StatusBar({ elements, activeId }: StatusBarProps) {
  const { sceneCount, currentScene, words } = useMemo(() => {
    const scenes = deriveScenes(elements);
    const current = activeId
      ? scenes.find((s) => s.elementIds.includes(activeId))
      : undefined;
    return {
      sceneCount: scenes.length,
      currentScene: current?.index ?? null,
      words: countWords(elements),
    };
  }, [elements, activeId]);

  return (
    <div className="statusbar">
      <span className="statusbar__item">
        {currentScene
          ? `Scene ${currentScene} of ${sceneCount}`
          : `${sceneCount} ${sceneCount === 1 ? "scene" : "scenes"}`}
      </span>
      <span className="statusbar__dot">·</span>
      <span className="statusbar__item">
        {words.toLocaleString()} {words === 1 ? "word" : "words"}
      </span>
    </div>
  );
}
