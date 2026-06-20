import { lineDiff, type ProposedEdit } from "../../lib/editing";
import "./diff.css";

interface DiffOverlayProps {
  edit: ProposedEdit;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Renders a proposed scene revision as a diff the writer must explicitly
 * accept or reject. Removed lines are struck through; added lines are
 * highlighted in the brass accent. Nothing is applied silently.
 */
export function DiffOverlay({ edit, onAccept, onReject }: DiffOverlayProps) {
  const lines = lineDiff(edit.oldText, edit.newText);

  return (
    <div className="diff">
      <div className="diff__head">
        <span className="diff__title">
          Proposed edit · Scene {edit.sceneIndex}
          {edit.heading ? `: ${edit.heading}` : ""}
        </span>
        <div className="diff__actions">
          <button type="button" className="diff__reject" onClick={onReject}>
            Reject
          </button>
          <button type="button" className="diff__accept" onClick={onAccept}>
            Accept
          </button>
        </div>
      </div>
      {edit.note && <p className="diff__note">{edit.note}</p>}
      <pre className="diff__body selectable">
        {lines.map((line, i) => (
          <div key={i} className={`diff__line diff__line--${line.type}`}>
            <span className="diff__sign">
              {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
            </span>
            <span className="diff__text">{line.text || " "}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}
