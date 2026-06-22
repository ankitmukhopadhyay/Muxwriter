import {
  ELEMENT_CYCLE,
  ELEMENT_GLYPHS,
  ELEMENT_LABELS,
  type ElementType,
} from "../../lib/fountain";

interface ElementRailProps {
  /** Type of the currently focused element, highlighted in the rail. */
  activeType: ElementType | null;
  onPick: (type: ElementType) => void;
  /** Whether the dual dialogue toggle applies (the active element is a cue). */
  dualEnabled: boolean;
  /** Whether the active character cue is already marked dual. */
  dualActive: boolean;
  onToggleDual: () => void;
}

/**
 * Vertical icon rail for switching the focused element's type. Mirrors the
 * Tab cycle order so the rail and the keyboard agree on element ordering. A
 * separate toggle at the foot marks a character cue as dual (side by side)
 * dialogue.
 */
export function ElementRail({
  activeType,
  onPick,
  dualEnabled,
  dualActive,
  onToggleDual,
}: ElementRailProps) {
  return (
    <nav className="rail" aria-label="Element types">
      {ELEMENT_CYCLE.map((type) => (
        <button
          key={type}
          type="button"
          className={`rail__btn${activeType === type ? " rail__btn--active" : ""}`}
          title={ELEMENT_LABELS[type]}
          aria-label={ELEMENT_LABELS[type]}
          aria-pressed={activeType === type}
          // Keep the editor selection: switch type without stealing focus.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(type)}
        >
          {ELEMENT_GLYPHS[type]}
        </button>
      ))}
      <span className="rail__divider" aria-hidden="true" />
      <button
        type="button"
        className={`rail__btn${dualActive ? " rail__btn--active" : ""}`}
        title="Dual dialogue (side by side)"
        aria-label="Dual dialogue"
        aria-pressed={dualActive}
        disabled={!dualEnabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggleDual}
      >
        ‖
      </button>
    </nav>
  );
}
