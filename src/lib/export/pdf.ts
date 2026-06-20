import { jsPDF } from "jspdf";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { ElementType, ScriptElement } from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { isTauri } from "../platform";

/**
 * Screenplay PDF export. Layout follows standard US Letter screenplay
 * geometry (1.5in left margin, 1in elsewhere, 12pt Courier, single spaced),
 * the same logic open source Fountain to PDF tools use, applied to our element
 * model. Points are 1/72in.
 */

const PAGE_H = 792; // 11in
const M_TOP = 72; // 1in
const M_BOTTOM = 72;
const LINE = 12; // 12pt single spaced
const CONTENT_BOTTOM = PAGE_H - M_BOTTOM;
const RIGHT_EDGE = 540; // 7.5in: right margin for right aligned transitions

// Left margin per element type, in points from the page's left edge.
const LEFT: Record<ElementType, number> = {
  scene_heading: 108, // 1.5in
  action: 108,
  character: 266, // 3.7in
  parenthetical: 223, // 3.1in
  dialogue: 180, // 2.5in
  transition: 108,
};

// Wrap width per element type, in points.
const WIDTH: Record<ElementType, number> = {
  scene_heading: 432,
  action: 432,
  character: 250,
  parenthetical: 144,
  dialogue: 252, // 3.5in, about 35 characters
  transition: 432,
};

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

/** Builds the screenplay PDF and returns it as bytes. */
export function buildScriptPdf(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
): Uint8Array {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  doc.setFont("courier", "normal");
  doc.setFontSize(12);

  // Optional title page when a title is set.
  if (metadata.title) {
    doc.setFont("courier", "bold");
    doc.text(metadata.title.toUpperCase(), 306, 360, { align: "center" });
    doc.setFont("courier", "normal");
    if (metadata.author) {
      doc.text(`written by ${metadata.author}`, 306, 390, { align: "center" });
    }
    doc.addPage();
  }

  let y = M_TOP + 10;
  let prevType: ElementType | null = null;

  for (const el of elements) {
    const contiguous =
      isDialogueInner(el.type) &&
      (prevType === "character" ||
        prevType === "parenthetical" ||
        prevType === "dialogue");
    if (prevType !== null && !contiguous) {
      y += LINE; // one blank line between separated elements
    }

    doc.setFont("courier", el.type === "scene_heading" ? "bold" : "normal");
    const text = formatText(el.type, el.text) || " ";
    const lines = doc.splitTextToSize(text, WIDTH[el.type]) as string[];

    for (const line of lines) {
      if (y > CONTENT_BOTTOM) {
        doc.addPage();
        y = M_TOP + 10;
      }
      if (el.type === "transition") {
        doc.text(line, RIGHT_EDGE, y, { align: "right" });
      } else {
        doc.text(line, LEFT[el.type], y);
      }
      y += LINE;
    }
    prevType = el.type;
  }

  return new Uint8Array(doc.output("arraybuffer"));
}

function defaultName(metadata: MuxwMetadata): string {
  const base = metadata.title?.trim() || "Untitled";
  return `${base.replace(/[\\/:*?"<>|]/g, "_")}.pdf`;
}

/** Builds and saves the screenplay PDF, prompting for a location. */
export async function exportScriptPdf(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
): Promise<void> {
  const bytes = buildScriptPdf(elements, metadata);
  if (isTauri()) {
    const path = await save({
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      defaultPath: defaultName(metadata),
    });
    if (!path) return;
    await invoke("write_binary_file", { path, bytes: Array.from(bytes) });
  } else {
    const blob = new Blob([bytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName(metadata);
    a.click();
    URL.revokeObjectURL(url);
  }
}
