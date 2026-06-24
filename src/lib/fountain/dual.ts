import type { ElementType, ScriptElement } from "./types";

/**
 * Groups a run of elements into render rows, pairing a normal dialogue block
 * with the dual ("^") block that immediately follows it so the two can be laid
 * out side by side. Shared by the on screen editor and the PDF exporter so both
 * lay dual dialogue out identically. Anything else passes through as a single.
 */

export type DualRow =
  | { kind: "single"; el: ScriptElement }
  | { kind: "dual"; left: ScriptElement[]; right: ScriptElement[] };

function isDialogueInner(type: ElementType): boolean {
  return type === "parenthetical" || type === "dialogue";
}

export function groupDualRows(elements: ScriptElement[]): DualRow[] {
  const rows: DualRow[] = [];
  const n = elements.length;
  let i = 0;
  while (i < n) {
    const el = elements[i];
    if (el.type === "character" && !el.dual) {
      const left = [el];
      let j = i + 1;
      while (j < n && isDialogueInner(elements[j].type)) left.push(elements[j++]);
      if (j < n && elements[j].type === "character" && elements[j].dual) {
        const right = [elements[j]];
        let k = j + 1;
        while (k < n && isDialogueInner(elements[k].type)) right.push(elements[k++]);
        rows.push({ kind: "dual", left, right });
        i = k;
        continue;
      }
      for (const b of left) rows.push({ kind: "single", el: b });
      i = j;
      continue;
    }
    rows.push({ kind: "single", el });
    i += 1;
  }
  return rows;
}
