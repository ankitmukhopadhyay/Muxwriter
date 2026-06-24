import type { ScriptElement } from "../fountain";
import type { MuxwMetadata } from "../muxw";
import { exportPdf } from "./pdf";
import { exportDocx } from "./docx";
import { exportFdx } from "./fdx";
import { exportFountain } from "./fountain";
import { exportText } from "./txt";
import type { ExportFormat, ExportOptions } from "./titlepage";

export { buildScriptPdf, exportPdf } from "./pdf";
export { chatToMarkdown, exportChat } from "./chat";
export { hasTitlePageContent } from "./titlepage";
export type { ExportFormat, ExportOptions } from "./titlepage";

/** Display metadata for each format, used by the export dialog. */
export const EXPORT_FORMATS: Array<{
  id: ExportFormat;
  label: string;
  hint: string;
}> = [
  { id: "pdf", label: "PDF", hint: "Standard screenplay, ready to share or print" },
  { id: "docx", label: "Word (.docx)", hint: "Editable document for Word or Google Docs" },
  { id: "fdx", label: "Final Draft (.fdx)", hint: "Import into Final Draft and most pro tools" },
  { id: "fountain", label: "Fountain (.fountain)", hint: "Portable plain text screenplay markup" },
  { id: "txt", label: "Plain text (.txt)", hint: "Simple formatted text" },
];

/** Dispatches an export to the chosen format. Returns false if cancelled. */
export async function runExport(
  format: ExportFormat,
  elements: ScriptElement[],
  metadata: MuxwMetadata,
  options: ExportOptions,
): Promise<boolean> {
  switch (format) {
    case "pdf":
      return exportPdf(elements, metadata, options);
    case "docx":
      return exportDocx(elements, metadata, options);
    case "fdx":
      return exportFdx(elements, metadata, options);
    case "fountain":
      return exportFountain(elements, metadata, options);
    case "txt":
      return exportText(elements, metadata, options);
  }
}
