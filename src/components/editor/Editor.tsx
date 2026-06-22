import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  cycleType,
  deriveScenes,
  getSuggestions,
  looksLikeSceneHeading,
  makeElement,
  nextTypeOnEnter,
  paginate,
  type ElementType,
  type ScriptElement,
} from "../../lib/fountain";
import { ElementBlock } from "./ElementBlock";
import { ElementRail } from "./ElementRail";
import "./editor.css";

export interface EditorSelection {
  text: string;
  sceneIndex: number;
  heading: string;
}

interface EditorProps {
  elements: ScriptElement[];
  onChange: (elements: ScriptElement[]) => void;
  /** Reports the focused element so the app can derive the current scene. */
  onActiveIdChange?: (id: string | null) => void;
  /** Reports the current text selection for highlight to ask. */
  onSelectionChange?: (selection: EditorSelection | null) => void;
  /** When the nonce changes, scrolls the given 1 based scene into view. */
  jumpRequest?: { index: number; nonce: number } | null;
}

interface FocusIntent {
  id: string;
  caret: number;
}

/**
 * The script page and its element rail. Owns selection, the keyboard grammar
 * (Enter splits and advances type, Tab cycles type, Backspace at the start of
 * a line merges into the previous element), SmartType autocomplete, and caret
 * restoration after the element list is restructured.
 */
export function Editor({
  elements,
  onChange,
  onActiveIdChange,
  onSelectionChange,
  jumpRequest,
}: EditorProps) {
  const [activeId, setActiveId] = useState<string | null>(
    elements[0]?.id ?? null,
  );
  const [focused, setFocused] = useState(false);
  // SmartType autocomplete state.
  const [acIndex, setAcIndex] = useState(0);
  const [acDismissed, setAcDismissed] = useState<string | null>(null);
  const refs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const pendingFocus = useRef<FocusIntent | null>(null);

  useEffect(() => {
    onActiveIdChange?.(activeId);
  }, [activeId, onActiveIdChange]);

  // Scroll a cited scene into view when a jump is requested.
  useEffect(() => {
    if (!jumpRequest) return;
    const scene = deriveScenes(elements).find(
      (s) => s.index === jumpRequest.index,
    );
    const headingId = scene?.elementIds[0];
    const node = headingId ? refs.current.get(headingId) : null;
    if (node) {
      node.scrollIntoView({ block: "center", behavior: "smooth" });
      node.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jumpRequest?.nonce]);

  const reportSelection = (id: string, node: HTMLTextAreaElement) => {
    if (!onSelectionChange) return;
    const text = node.value.slice(node.selectionStart, node.selectionEnd).trim();
    if (!text) {
      onSelectionChange(null);
      return;
    }
    const scene = deriveScenes(elements).find((s) =>
      s.elementIds.includes(id),
    );
    onSelectionChange({
      text,
      sceneIndex: scene?.index ?? 0,
      heading: scene?.heading ?? "",
    });
  };

  // After a structural edit re-renders the list, restore focus and caret.
  useLayoutEffect(() => {
    const intent = pendingFocus.current;
    if (!intent) return;
    const node = refs.current.get(intent.id);
    if (node) {
      node.focus();
      const pos = Math.min(intent.caret, node.value.length);
      node.setSelectionRange(pos, pos);
    }
    pendingFocus.current = null;
  });

  const activeEl = elements.find((el) => el.id === activeId) ?? null;
  const activeType = activeEl?.type ?? null;

  const indexOf = (id: string) => elements.findIndex((el) => el.id === id);

  const setText = (id: string, text: string) => {
    setAcDismissed(null); // typing re-enables autocomplete
    setAcIndex(0);
    const el = elements.find((e) => e.id === id);
    // Auto format: an action line that starts with INT./EXT. becomes a heading.
    const type =
      el?.type === "action" && looksLikeSceneHeading(text)
        ? "scene_heading"
        : el?.type;
    onChange(
      elements.map((e) =>
        e.id === id ? { ...e, text, type: type ?? e.type } : e,
      ),
    );
  };

  const setType = (id: string, type: ElementType) => {
    onChange(elements.map((el) => (el.id === id ? { ...el, type } : el)));
  };

  /** Split the element at the caret, the remainder becoming a new element. */
  const splitAt = (id: string, caret: number) => {
    const i = indexOf(id);
    if (i === -1) return;
    const el = elements[i];
    const before = el.text.slice(0, caret);
    const after = el.text.slice(caret);
    const created = makeElement(nextTypeOnEnter(el.type), after);
    const next = [...elements];
    next[i] = { ...el, text: before };
    next.splice(i + 1, 0, created);
    pendingFocus.current = { id: created.id, caret: 0 };
    setActiveId(created.id);
    onChange(next);
  };

  /** Merge an element into the previous one (Backspace at column zero). */
  const mergeBack = (id: string) => {
    const i = indexOf(id);
    if (i <= 0) return;
    const prev = elements[i - 1];
    const cur = elements[i];
    const caret = prev.text.length;
    const next = [...elements];
    next[i - 1] = { ...prev, text: prev.text + cur.text };
    next.splice(i, 1);
    pendingFocus.current = { id: prev.id, caret };
    setActiveId(prev.id);
    onChange(next);
  };

  const focusSibling = (id: string, dir: -1 | 1, caret: number) => {
    const i = indexOf(id);
    const target = elements[i + dir];
    if (!target) return false;
    pendingFocus.current = { id: target.id, caret };
    setActiveId(target.id);
    // Force the focus effect to run even though the list is unchanged.
    onChange([...elements]);
    return true;
  };

  // SmartType suggestions for the focused element.
  const suggestions =
    focused && activeEl && activeEl.text !== acDismissed
      ? getSuggestions(activeEl.type, activeEl.text, elements)
      : [];
  const acIndexClamped = suggestions.length
    ? Math.min(acIndex, suggestions.length - 1)
    : 0;

  /** Accept a suggestion, replacing the element text and staying on it. */
  const acceptSuggestion = (id: string, suggestion: string) => {
    onChange(
      elements.map((e) => (e.id === id ? { ...e, text: suggestion } : e)),
    );
    pendingFocus.current = { id, caret: suggestion.length };
    setAcIndex(0);
    setAcDismissed(suggestion);
  };

  /** Accept a suggestion and advance to a new next element (Enter). */
  const acceptAndAdvance = (id: string, suggestion: string) => {
    const i = indexOf(id);
    if (i === -1) return;
    const el = elements[i];
    const created = makeElement(nextTypeOnEnter(el.type), "");
    const next = [...elements];
    next[i] = { ...el, text: suggestion };
    next.splice(i + 1, 0, created);
    pendingFocus.current = { id: created.id, caret: 0 };
    setActiveId(created.id);
    setAcIndex(0);
    setAcDismissed(null);
    onChange(next);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    id: string,
  ) => {
    const ta = e.currentTarget;
    const caret = ta.selectionStart;
    const hasSelection = ta.selectionStart !== ta.selectionEnd;

    // SmartType navigation takes precedence while the menu is open.
    if (suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAcIndex((i) => Math.min(i + 1, suggestions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAcIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        acceptAndAdvance(id, suggestions[acIndexClamped]);
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        acceptSuggestion(id, suggestions[acIndexClamped]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setAcDismissed(activeEl?.text ?? null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      splitAt(id, caret);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const i = indexOf(id);
      const prevType = i > 0 ? elements[i - 1].type : null;
      const el = elements[i];
      setType(id, cycleType(el?.type ?? "action", prevType, e.shiftKey));
    } else if (e.key === "Backspace" && caret === 0 && !hasSelection) {
      const i = indexOf(id);
      if (i > 0) {
        e.preventDefault();
        mergeBack(id);
      }
    } else if (e.key === "ArrowUp" && !hasSelection) {
      const beforeCaret = ta.value.slice(0, caret);
      if (!beforeCaret.includes("\n")) {
        if (focusSibling(id, -1, Number.MAX_SAFE_INTEGER)) e.preventDefault();
      }
    } else if (e.key === "ArrowDown" && !hasSelection) {
      const afterCaret = ta.value.slice(caret);
      if (!afterCaret.includes("\n")) {
        if (focusSibling(id, 1, 0)) e.preventDefault();
      }
    }
  };

  const focusEnd = (el: ScriptElement | undefined) => {
    if (!el) return;
    pendingFocus.current = { id: el.id, caret: el.text.length };
    setActiveId(el.id);
    onChange([...elements]);
  };

  const pages = paginate(elements);

  // Position the SmartType menu under the focused element.
  let acStyle: { top: number; left: number } | null = null;
  if (suggestions.length > 0 && activeId) {
    const node = refs.current.get(activeId);
    if (node) {
      const r = node.getBoundingClientRect();
      acStyle = { top: r.bottom + 2, left: r.left };
    }
  }

  return (
    <div className="editor">
      <ElementRail
        activeType={activeType}
        onPick={(type) => activeId && setType(activeId, type)}
      />
      <div className="editor__scroll">
        <div className="pages">
          {pages.map((pageElements, pageIndex) => (
            <div
              className="page"
              key={pageIndex}
              onMouseDown={(e) => {
                if (e.target === e.currentTarget) {
                  e.preventDefault();
                  focusEnd(pageElements[pageElements.length - 1]);
                }
              }}
            >
              {pageIndex > 0 && (
                <span className="page__number">{pageIndex + 1}.</span>
              )}
              {pageElements.map((el) => (
                <ElementBlock
                  key={el.id}
                  element={el}
                  onChangeText={(text) => setText(el.id, text)}
                  onKeyDown={(e) => handleKeyDown(e, el.id)}
                  onFocus={() => {
                    setActiveId(el.id);
                    setFocused(true);
                    setAcDismissed(null);
                    setAcIndex(0);
                  }}
                  onBlur={() => setFocused(false)}
                  onSelect={(node) => reportSelection(el.id, node)}
                  registerRef={(node) => {
                    if (node) refs.current.set(el.id, node);
                    else refs.current.delete(el.id);
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {acStyle && (
        <div className="smarttype" style={{ top: acStyle.top, left: acStyle.left }}>
          {suggestions.map((s, i) => (
            <button
              key={s}
              type="button"
              className={`smarttype__item${
                i === acIndexClamped ? " smarttype__item--active" : ""
              }`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => activeId && acceptSuggestion(activeId, s)}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
