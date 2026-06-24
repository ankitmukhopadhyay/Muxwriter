import type { ScriptElement } from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { saveTextExport } from "./save";
import { scriptToText } from "./textlayout";
import { titlePage, type ExportOptions } from "./titlepage";

/** A simple centered text title page. */
function titlePageText(metadata: MuxwMetadata): string {
  const t = titlePage(metadata);
  const center = (s: string) => {
    const pad = Math.max(0, Math.floor((60 - s.length) / 2));
    return " ".repeat(pad) + s;
  };
  const lines: string[] = ["", "", "", "", "", "", "", ""];
  if (t.title) lines.push(center(t.title.toUpperCase()));
  lines.push("");
  if (t.author) {
    lines.push(center("written by"));
    lines.push("");
    lines.push(center(t.author));
  }
  lines.push("", "", "", "", "", "", "", "", "", "");
  if (t.draftDate) lines.push(center(t.draftDate));
  if (t.contact) for (const c of t.contact.split("\n")) lines.push(center(c));
  if (t.copyright) lines.push(center(t.copyright));
  return lines.join("\n") + "\n\f\n";
}

export function buildText(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): string {
  const body = scriptToText(elements);
  return options.titlePage ? titlePageText(metadata) + body : body;
}

export async function exportText(
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<boolean> {
  return saveTextExport(
    metadata,
    "Plain Text",
    "txt",
    "text/plain;charset=utf-8",
    buildText(elements, metadata, options),
  );
}
