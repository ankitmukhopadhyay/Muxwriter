import { useEffect, useMemo, useRef, useState } from "react";
import { findMatches, type Match } from "../../lib/find";
import type { ScriptElement } from "../../lib/fountain";
import "./find.css";

interface FindReplaceProps {
  elements: ScriptElement[];
  replaceMode: boolean;
  onReveal: (match: Match) => void;
  onReplaceOne: (match: Match, replacement: string) => void;
  onReplaceAll: (query: string, replacement: string, matchCase: boolean) => number;
  onClose: () => void;
}

/**
 * A compact find and replace bar pinned to the top of the editor. It owns the
 * query, the current match index, and case sensitivity; the actual edits and
 * the act of revealing a match in the page are delegated to the app, so find
 * stays a pure view over the element model and replacements flow through undo.
 */
export function FindReplace({
  elements,
  replaceMode,
  onReveal,
  onReplaceOne,
  onReplaceAll,
  onClose,
}: FindReplaceProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealTick, setRevealTick] = useState(0);
  const [allNotice, setAllNotice] = useState<string | null>(null);
  const findInput = useRef<HTMLInputElement>(null);

  const matches = useMemo(
    () => findMatches(elements, query, matchCase),
    [elements, query, matchCase],
  );

  // Focus the query field whenever the bar opens or switches mode.
  useEffect(() => {
    findInput.current?.focus();
    findInput.current?.select();
  }, [replaceMode]);

  // Keep the active index inside the current match set.
  const safeIndex = matches.length ? Math.min(index, matches.length - 1) : 0;

  // Reveal the active match on explicit navigation (tracked by revealTick),
  // never while the writer is just typing in the page.
  useEffect(() => {
    if (matches.length === 0) return;
    onReveal(matches[Math.min(index, matches.length - 1)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealTick]);

  const go = (next: number) => {
    if (matches.length === 0) return;
    const wrapped = (next + matches.length) % matches.length;
    setIndex(wrapped);
    setRevealTick((t) => t + 1);
  };

  const onQueryChange = (value: string) => {
    setQuery(value);
    setIndex(0);
    setAllNotice(null);
    // Defer the reveal a tick so matches reflect the new query.
    setRevealTick((t) => t + 1);
  };

  const replaceCurrent = () => {
    if (matches.length === 0) return;
    onReplaceOne(matches[safeIndex], replacement);
    setAllNotice(null);
    // The next occurrence slides into this index; reveal it once it recomputes.
    setRevealTick((t) => t + 1);
  };

  const replaceEverything = () => {
    const n = onReplaceAll(query, replacement, matchCase);
    setAllNotice(n === 0 ? "No matches" : `Replaced ${n}`);
  };

  const onFindKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      go(safeIndex + (e.shiftKey ? -1 : 1));
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  const counter = query
    ? matches.length
      ? `${safeIndex + 1}/${matches.length}`
      : "0/0"
    : "";

  return (
    <div className="findbar" role="search">
      <div className="findbar__row">
        <input
          ref={findInput}
          className="findbar__input"
          placeholder="Find"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onFindKey}
        />
        <span className="findbar__count">{counter}</span>
        <button
          type="button"
          className={`findbar__btn${matchCase ? " findbar__btn--active" : ""}`}
          onClick={() => setMatchCase((v) => !v)}
          title="Match case"
          aria-label="Match case"
        >
          Aa
        </button>
        <button
          type="button"
          className="findbar__btn"
          onClick={() => go(safeIndex - 1)}
          disabled={matches.length === 0}
          title="Previous match"
          aria-label="Previous match"
        >
          ↑
        </button>
        <button
          type="button"
          className="findbar__btn"
          onClick={() => go(safeIndex + 1)}
          disabled={matches.length === 0}
          title="Next match"
          aria-label="Next match"
        >
          ↓
        </button>
        <button
          type="button"
          className="findbar__btn"
          onClick={onClose}
          title="Close"
          aria-label="Close find"
        >
          ✕
        </button>
      </div>
      {replaceMode && (
        <div className="findbar__row">
          <input
            className="findbar__input"
            placeholder="Replace with"
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
            }}
          />
          <button
            type="button"
            className="findbar__btn findbar__btn--wide"
            onClick={replaceCurrent}
            disabled={matches.length === 0}
          >
            Replace
          </button>
          <button
            type="button"
            className="findbar__btn findbar__btn--wide"
            onClick={replaceEverything}
            disabled={matches.length === 0}
          >
            All
          </button>
          {allNotice && <span className="findbar__count">{allNotice}</span>}
        </div>
      )}
    </div>
  );
}
