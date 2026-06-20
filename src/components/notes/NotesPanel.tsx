import { useState } from "react";
import { deriveScenes, type ScriptElement } from "../../lib/fountain";
import type { MuxwMetadata } from "../../lib/muxw";
import "./notes.css";

interface NotesPanelProps {
  metadata: MuxwMetadata;
  elements: ScriptElement[];
  onChange: (metadata: MuxwMetadata) => void;
  onClose: () => void;
}

/**
 * Notes are authored, not derived, so they live in the .muxw metadata block:
 * a freeform global space plus per scene and per character notes.
 */
export function NotesPanel({
  metadata,
  elements,
  onChange,
  onClose,
}: NotesPanelProps) {
  const scenes = deriveScenes(elements);
  const characters = Array.from(
    new Set(
      elements
        .filter((el) => el.type === "character")
        .map((el) => el.text.trim().toUpperCase().replace(/\s*\(.*\)$/, ""))
        .filter(Boolean),
    ),
  );

  const [sceneKey, setSceneKey] = useState(
    scenes[0] ? String(scenes[0].index) : "",
  );
  const [charKey, setCharKey] = useState(characters[0] ?? "");

  const setGlobal = (value: string) =>
    onChange({ ...metadata, notes: { ...metadata.notes, global: value } });

  const setSceneNote = (value: string) =>
    onChange({
      ...metadata,
      notes: {
        ...metadata.notes,
        byScene: { ...metadata.notes.byScene, [sceneKey]: value },
      },
    });

  const setCharNote = (value: string) =>
    onChange({
      ...metadata,
      notes: {
        ...metadata.notes,
        byCharacter: { ...metadata.notes.byCharacter, [charKey]: value },
      },
    });

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal modal--wide"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Notes</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="modal__body notes">
          <label className="field">
            <span className="field__label">Global story notes</span>
            <textarea
              className="notes__area selectable"
              rows={4}
              placeholder="Anything about the story as a whole…"
              value={metadata.notes.global}
              onChange={(e) => setGlobal(e.target.value)}
            />
          </label>

          <div className="notes__row">
            <span className="field__label">Scene note</span>
            <select
              value={sceneKey}
              onChange={(e) => setSceneKey(e.target.value)}
              disabled={scenes.length === 0}
            >
              {scenes.map((s) => (
                <option key={s.id} value={String(s.index)}>
                  Scene {s.index}: {s.heading || "(untitled)"}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="notes__area selectable"
            rows={3}
            placeholder="A note about this scene…"
            value={metadata.notes.byScene[sceneKey] ?? ""}
            onChange={(e) => setSceneNote(e.target.value)}
            disabled={scenes.length === 0}
          />

          <div className="notes__row">
            <span className="field__label">Character note</span>
            <select
              value={charKey}
              onChange={(e) => setCharKey(e.target.value)}
              disabled={characters.length === 0}
            >
              {characters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="notes__area selectable"
            rows={3}
            placeholder="A note about this character…"
            value={metadata.notes.byCharacter[charKey] ?? ""}
            onChange={(e) => setCharNote(e.target.value)}
            disabled={characters.length === 0}
          />
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </footer>
      </div>
    </div>
  );
}
