import { useLayoutEffect, useRef } from "react";
import type { ElementType, ScriptElement } from "../../lib/fountain";

interface ElementBlockProps {
  element: ScriptElement;
  onChangeText: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus: () => void;
  onSelect: (node: HTMLTextAreaElement) => void;
  registerRef: (node: HTMLTextAreaElement | null) => void;
}

const PLACEHOLDERS: Record<ElementType, string> = {
  scene_heading: "INT. LOCATION - DAY",
  action: "Action",
  character: "CHARACTER",
  parenthetical: "(beat)",
  dialogue: "Dialogue",
  transition: "CUT TO:",
};

/**
 * A single editable screenplay element. The textarea grows to fit its content
 * so the page reads as one continuous document rather than a stack of boxed
 * inputs. All structural keyboard handling is delegated upward to the Editor.
 */
export function ElementBlock({
  element,
  onChangeText,
  onKeyDown,
  onFocus,
  onSelect,
  registerRef,
}: ElementBlockProps) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Grow the textarea to fit its content on every change.
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  }, [element.text]);

  return (
    <textarea
      ref={(node) => {
        ref.current = node;
        registerRef(node);
      }}
      className={`element element--${element.type} selectable`}
      value={element.text}
      rows={1}
      spellCheck
      placeholder={PLACEHOLDERS[element.type]}
      onChange={(e) => onChangeText(e.target.value)}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onSelect={(e) => onSelect(e.currentTarget)}
    />
  );
}
