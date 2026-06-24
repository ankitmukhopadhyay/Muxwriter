import type { ElementType, ScriptElement } from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { saveTextExport } from "./save";
import { titlePage, type ExportOptions } from "./titlepage";

/**
 * Final Draft (.fdx) export. FDX is XML: each screenplay element is a
 * <Paragraph> with a Type that maps onto Final Draft's element styles, so any
 * tool that reads FDX (Final Draft, WriterDuet, Celtx, Fade In) imports the
 * script with correct formatting.
 */

const FDX_TYPE: Record<ElementType, string> = {
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

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

function paragraph(type: string, text: string, indent = "    "): string {
  return `${indent}<Paragraph Type="${type}"><Text>${escapeXml(text)}</Text></Paragraph>`;
}

function titlePageXml(metadata: MuxwMetadata): string {
  const t = titlePage(metadata);
  const centered = (text: string) =>
    `      <Paragraph Alignment="Center"><Text>${escapeXml(text)}</Text></Paragraph>`;
  const rows: string[] = [];
  if (t.title) rows.push(centered(t.title.toUpperCase()));
  if (t.author) {
    rows.push(centered("written by"));
    rows.push(centered(t.author));
  }
  if (t.draftDate) rows.push(centered(t.draftDate));
  if (t.contact) for (const c of t.contact.split("\n")) rows.push(centered(c));
  if (t.copyright) rows.push(centered(t.copyright));
  if (rows.length === 0) return "";
  return `  <TitlePage>\n    <Content>\n${rows.join("\n")}\n    </Content>\n  </TitlePage>\n`;
}

export function buildFdx(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): string {
  const body = elements
    .map((el) => paragraph(FDX_TYPE[el.type], format(el.type, el.text)))
    .join("\n");
  const title = options.titlePage ? titlePageXml(metadata) : "";
  return [
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
    '<FinalDraft DocumentType="Script" Template="No" Version="1">',
    "  <Content>",
    body,
    "  </Content>",
    title.trimEnd(),
    "</FinalDraft>",
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export async function exportFdx(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<boolean> {
  return saveTextExport(
    metadata,
    "Final Draft",
    "fdx",
    "application/xml",
    buildFdx(elements, metadata, options),
  );
}
