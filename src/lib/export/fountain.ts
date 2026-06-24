import { elementsToFountain, type ScriptElement } from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { saveTextExport } from "./save";
import { titlePage, type ExportOptions } from "./titlepage";

/**
 * Fountain export. The body is the same Fountain the app round trips; an
 * optional title page is written as standard Fountain front matter (key/value
 * pairs above the first blank line).
 */
export function buildFountain(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): string {
  const body = elementsToFountain(elements);
  if (!options.titlePage) return body;

  const t = titlePage(metadata);
  const lines: string[] = [];
  if (t.title) lines.push(`Title: ${t.title}`);
  if (t.author) {
    lines.push("Credit: written by");
    lines.push(`Author: ${t.author}`);
  }
  if (t.draftDate) lines.push(`Draft date: ${t.draftDate}`);
  if (t.contact) {
    lines.push("Contact:");
    for (const line of t.contact.split("\n")) lines.push(`\t${line}`);
  }
  if (t.copyright) lines.push(`Copyright: ${t.copyright}`);
  if (lines.length === 0) return body;
  return `${lines.join("\n")}\n\n${body}`;
}

export async function exportFountain(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<boolean> {
  return saveTextExport(
    metadata,
    "Fountain Screenplay",
    "fountain",
    "text/plain;charset=utf-8",
    buildFountain(elements, metadata, options),
  );
}
