import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { groupDualRows, type ElementType, type ScriptElement } from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { saveBinaryExport } from "./save";
import { titlePage, type ExportOptions } from "./titlepage";

/**
 * DOCX export via the `docx` library. Lays the script out in Courier 12pt with
 * standard screenplay indents (twips; 1 inch = 1440), so Word and Google Docs
 * open it as a properly formatted screenplay. The page's 1.5in left margin is
 * set on the section; per element indents are relative to that.
 */

const FONT = "Courier New";
const SIZE = 24; // half points => 12pt

// Left indent from the section's left margin, in twips.
const INDENT: Record<ElementType, number> = {
  scene_heading: 0,
  action: 0,
  character: 3168, // 2.2in
  parenthetical: 2304, // 1.6in
  dialogue: 1440, // 1.0in
  transition: 0,
};

// Right indent, to set the wrap width of dialogue.
const RIGHT: Record<ElementType, number> = {
  scene_heading: 0,
  action: 0,
  character: 0,
  parenthetical: 1440,
  dialogue: 2160,
  transition: 0,
};

function format(type: ElementType, raw: string): string {
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
      return text;
  }
}

function isDialogueInner(type: ElementType): boolean {
  return type === "parenthetical" || type === "dialogue";
}

function elementParagraph(
  el: ScriptElement,
  prevType: ElementType | null,
  first: boolean,
): Paragraph {
  const contiguous =
    isDialogueInner(el.type) &&
    (prevType === "character" ||
      prevType === "parenthetical" ||
      prevType === "dialogue");
  const before = first ? 0 : contiguous ? 0 : el.type === "scene_heading" ? 240 : 120;
  return new Paragraph({
    alignment: el.type === "transition" ? AlignmentType.RIGHT : AlignmentType.LEFT,
    indent: { left: INDENT[el.type], right: RIGHT[el.type] },
    spacing: { before, after: 0, line: 240 },
    children: [
      new TextRun({
        text: format(el.type, el.text) || " ",
        font: FONT,
        size: SIZE,
        bold: el.type === "scene_heading",
      }),
    ],
  });
}

/** Paragraphs for one speaker inside a dual dialogue column (narrow cell). */
function dualCellParagraphs(block: ScriptElement[]): Paragraph[] {
  return block.map((el, i) => {
    const center = el.type === "character";
    return new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      indent: el.type === "parenthetical" ? { left: 360 } : undefined,
      spacing: { before: i === 0 ? 0 : 0, after: 0, line: 240 },
      children: [
        new TextRun({
          text: format(el.type, el.text) || " ",
          font: FONT,
          size: SIZE,
        }),
      ],
    });
  });
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "auto" } as const;

/** A borderless two column table laying dual dialogue out side by side. */
function dualTable(left: ScriptElement[], right: ScriptElement[]): Table {
  const cell = (block: ScriptElement[]) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 120, bottom: 0, left: 80, right: 80 },
      borders: {
        top: NO_BORDER,
        bottom: NO_BORDER,
        left: NO_BORDER,
        right: NO_BORDER,
      },
      children: dualCellParagraphs(block),
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: NO_BORDER,
      bottom: NO_BORDER,
      left: NO_BORDER,
      right: NO_BORDER,
      insideHorizontal: NO_BORDER,
      insideVertical: NO_BORDER,
    },
    rows: [new TableRow({ children: [cell(left), cell(right)] })],
  });
}

function titlePageParagraphs(metadata: MuxwMetadata): Paragraph[] {
  const t = titlePage(metadata);
  const center = (text: string, bold = false, before = 0) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before, after: 0, line: 240 },
      children: [new TextRun({ text, font: FONT, size: SIZE, bold })],
    });
  const out: Paragraph[] = [];
  if (t.title) out.push(center(t.title.toUpperCase(), true, 3600));
  if (t.author) {
    out.push(center("written by", false, 240));
    out.push(center(t.author, false, 240));
  }
  if (t.draftDate) out.push(center(t.draftDate, false, 2400));
  if (t.contact) for (const c of t.contact.split("\n")) out.push(center(c));
  if (t.copyright) out.push(center(t.copyright, false, 240));
  // A trailing page break paragraph so the script starts on a fresh page.
  out.push(new Paragraph({ children: [], pageBreakBefore: false }));
  return out;
}

export async function buildDocx(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<Uint8Array> {
  const body: (Paragraph | Table)[] = [];
  let prevType: ElementType | null = null;
  const rows = groupDualRows(elements);
  rows.forEach((row, i) => {
    if (row.kind === "single") {
      body.push(elementParagraph(row.el, prevType, i === 0));
      prevType = row.el.type;
    } else {
      body.push(dualTable(row.left, row.right));
      prevType = "dialogue";
    }
  });

  const sectionProps = {
    page: {
      margin: { top: 1440, bottom: 1440, left: 2160, right: 1440 },
    },
  };

  const sections = options.titlePage
    ? [
        {
          properties: sectionProps,
          children: titlePageParagraphs(metadata),
        },
        { properties: { ...sectionProps, type: "nextPage" }, children: body },
      ]
    : [{ properties: sectionProps, children: body }];

  const doc = new Document({ sections: sections as never });
  const blob = await Packer.toBlob(doc);
  return new Uint8Array(await blob.arrayBuffer());
}

export async function exportDocx(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<boolean> {
  const bytes = await buildDocx(elements, metadata, options);
  return saveBinaryExport(
    metadata,
    "Word Document",
    "docx",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    bytes,
  );
}
