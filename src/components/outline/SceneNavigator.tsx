import { useMemo } from "react";
import { deriveScenes, type ScriptElement } from "../../lib/fountain";
import "./outline.css";

interface SceneNavigatorProps {
  elements: ScriptElement[];
  activeId: string | null;
  onJump: (index: number) => void;
  onClose: () => void;
}

/**
 * A Celtx style scene navigator: the script's spine as a clickable outline of
 * sluglines. Clicking a scene scrolls the editor to it; the scene the cursor is
 * in is highlighted. This is how writers move around a feature length script
 * without endless scrolling.
 */
export function SceneNavigator({
  elements,
  activeId,
  onJump,
  onClose,
}: SceneNavigatorProps) {
  const scenes = useMemo(() => deriveScenes(elements), [elements]);
  const currentIndex = activeId
    ? scenes.find((s) => s.elementIds.includes(activeId))?.index ?? null
    : null;

  return (
    <aside className="outline" aria-label="Scene navigator">
      <header className="outline__header">
        <span className="outline__title">Scenes</span>
        <span className="outline__count">{scenes.length}</span>
        <button
          type="button"
          className="outline__close"
          onClick={onClose}
          aria-label="Close scene navigator"
        >
          ✕
        </button>
      </header>
      <div className="outline__list">
        {scenes.length === 0 ? (
          <div className="outline__empty">No scenes yet.</div>
        ) : (
          scenes.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`outline__item${
                s.index === currentIndex ? " outline__item--active" : ""
              }`}
              onClick={() => onJump(s.index)}
              title={s.heading || "(untitled)"}
            >
              <span className="outline__num">{s.index}</span>
              <span className="outline__heading">
                {s.heading || "(untitled)"}
              </span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
