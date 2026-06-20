import {
  characterBreakdown,
  sceneBreakdown,
  locationBreakdown,
} from "../../lib/insights";
import type { ScriptElement } from "../../lib/fountain";
import "./insights.css";

interface InsightsModalProps {
  elements: ScriptElement[];
  onClose: () => void;
}

/**
 * Character and scene reports derived from the same structured element model
 * the editor and AI read from. No separate extraction system.
 */
export function InsightsModal({ elements, onClose }: InsightsModalProps) {
  const characters = characterBreakdown(elements);
  const scenes = sceneBreakdown(elements);
  const locations = locationBreakdown(elements);

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div
        className="modal modal--wide"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2>Insights</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="modal__body insights">
          <section className="insights__section">
            <h3 className="insights__heading">Characters</h3>
            {characters.length === 0 ? (
              <p className="insights__empty">No characters yet.</p>
            ) : (
              <table className="insights__table">
                <thead>
                  <tr>
                    <th>Character</th>
                    <th className="num">Lines</th>
                    <th className="num">Scenes</th>
                  </tr>
                </thead>
                <tbody>
                  {characters.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td className="num">{c.lines}</td>
                      <td className="num">{c.scenes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="insights__section">
            <h3 className="insights__heading">Scenes</h3>
            <table className="insights__table">
              <thead>
                <tr>
                  <th className="num">#</th>
                  <th>Env</th>
                  <th>Location</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {scenes.map((s) => (
                  <tr key={s.id}>
                    <td className="num">{s.index}</td>
                    <td>{s.environment}</td>
                    <td>{s.location || "—"}</td>
                    <td>{s.timeOfDay || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="insights__section">
            <h3 className="insights__heading">Locations</h3>
            <table className="insights__table">
              <thead>
                <tr>
                  <th>Location</th>
                  <th className="num">Scenes</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.location}>
                    <td>{l.location}</td>
                    <td className="num">{l.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </div>
  );
}
