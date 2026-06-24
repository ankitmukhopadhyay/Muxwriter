import { jsPDF } from "jspdf";
import {
  groupDualRows,
  paginate,
  type ElementType,
  type ScriptElement,
} from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { saveBinaryExport } from "./save";
import { titlePage, type ExportOptions } from "./titlepage";

/**
 * Screenplay PDF export. Layout follows standard US Letter screenplay
 * geometry (1.5in left margin, 1in elsewhere, 12pt Courier, single spaced).
 * Dual dialogue renders as two side by side columns, matching the editor.
 * Points are 1/72in.
 */

const M_TOP = 72; // 1in
const LINE = 12; // 12pt single spaced
const RIGHT_EDGE = 540; // 7.5in: right margin for right aligned transitions
const PAGE_CENTER = 306; // 4.25in

const LEFT: Record<ElementType, number> = {
  scene_heading: 108,
  action: 108,
  character: 266,
  parenthetical: 223,
  dialogue: 180,
  transition: 108,
};

const WIDTH: Record<ElementType, number> = {
  scene_heading: 432,
  action: 432,
  character: 250,
  parenthetical: 144,
  dialogue: 252,
  transition: 432,
};

// Dual dialogue: two columns, each about 2.6in wide.
const DUAL_LEFT_X = 108;
const DUAL_RIGHT_X = 318;
const DUAL_WIDTH = 186;

function formatText(type: ElementType, raw: string): string {
  const text = raw.trim();
  switch (type) {
    case "scene_heading":
    case "character":
    case "transition":
      return text.toUpperCase();
    case "parenthetical": {
      const inner = text.replace(/^\(+|\)+$/g, "").trim();
      return `(${inner})`;
    }
    default:
      return raw;
  }
}

function isDialogueInner(type: ElementType): boolean {
  return type === "parenthetical" || type === "dialogue";
}

function blankLinesBefore(
  type: ElementType,
  prevType: ElementType | null,
  first: boolean,
): number {
  if (first) return 0;
  const contiguous =
    isDialogueInner(type) &&
    (prevType === "character" ||
      prevType === "parenthetical" ||
      prevType === "dialogue");
  if (contiguous) return 0;
  return type === "scene_heading" ? 2 : 1;
}

/** Renders one dialogue block inside a dual column; returns lines consumed. */
function drawDualColumn(
  doc: jsPDF,
  block: ScriptElement[],
  colX: number,
  startY: number,
): number {
  const colCenter = colX + DUAL_WIDTH / 2;
  let y = startY;
  let lines = 0;
  for (const el of block) {
    doc.setFont("courier", "normal");
    const text = formatText(el.type, el.text) || " ";
    const wrapped = doc.splitTextToSize(text, DUAL_WIDTH) as string[];
    for (const line of wrapped) {
      if (el.type === "character") {
        doc.text(line, colCenter, y, { align: "center" });
      } else if (el.type === "parenthetical") {
        doc.text(line, colX + 20, y);
      } else {
        doc.text(line, colX, y);
      }
      y += LINE;
      lines += 1;
    }
  }
  return lines;
}

function drawTitlePage(doc: jsPDF, metadata: MuxwMetadata): void {
  const t = titlePage(metadata);
  doc.setFont("courier", "bold");
  if (t.title) {
    doc.text(t.title.toUpperCase(), PAGE_CENTER, 320, { align: "center" });
  }
  doc.setFont("courier", "normal");
  if (t.author) {
    doc.text("written by", PAGE_CENTER, 360, { align: "center" });
    doc.text(t.author, PAGE_CENTER, 384, { align: "center" });
  }
  if (t.draftDate) {
    doc.text(t.draftDate, PAGE_CENTER, 600, { align: "center" });
  }
  let y = 660;
  if (t.contact) {
    for (const line of t.contact.split("\n")) {
      doc.text(line, PAGE_CENTER, y, { align: "center" });
      y += LINE;
    }
  }
  if (t.copyright) {
    doc.text(t.copyright, PAGE_CENTER, y + LINE, { align: "center" });
  }
}

/** Builds the screenplay PDF and returns it as bytes. */
export function buildScriptPdf(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setFontSize(12);

  let started = false;
  const startPage = () => {
    if (started) doc.addPage();
    started = true;
  };

  if (options.titlePage) {
    startPage();
    drawTitlePage(doc, metadata);
  }

  const pages = paginate(elements);
  pages.forEach((pageElements, pageIndex) => {
    startPage();

    if (pageIndex > 0) {
      doc.setFont("courier", "normal");
      doc.text(`${pageIndex + 1}.`, RIGHT_EDGE, M_TOP - 24, { align: "right" });
    }

    let y = M_TOP + LINE;
    let prevType: ElementType | null = null;
    const rows = groupDualRows(pageElements);
    rows.forEach((row, i) => {
      if (row.kind === "single") {
        const el = row.el;
        y += blankLinesBefore(el.type, prevType, i === 0) * LINE;
        doc.setFont("courier", el.type === "scene_heading" ? "bold" : "normal");
        const text = formatText(el.type, el.text) || " ";
        const lines = doc.splitTextToSize(text, WIDTH[el.type]) as string[];
        for (const line of lines) {
          if (el.type === "transition") {
            doc.text(line, RIGHT_EDGE, y, { align: "right" });
          } else {
            doc.text(line, LEFT[el.type], y);
          }
          y += LINE;
        }
        prevType = el.type;
      } else {
        // Dual dialogue: lay both columns from the same baseline, advance by
        // whichever is taller.
        y += (i === 0 ? 0 : 1) * LINE;
        const leftLines = drawDualColumn(doc, row.left, DUAL_LEFT_X, y);
        const rightLines = drawDualColumn(doc, row.right, DUAL_RIGHT_X, y);
        y += Math.max(leftLines, rightLines) * LINE;
        prevType = "dialogue";
      }
    });
  });

  return new Uint8Array(doc.output("arraybuffer"));
}

export async function exportPdf(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<boolean> {
  const bytes = buildScriptPdf(elements, metadata, options);
  return saveBinaryExport(metadata, "PDF", "pdf", "application/pdf", bytes);
}
