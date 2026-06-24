import type { MuxwMetadata } from "../muxw";

/**
 * The title page fields, normalized once so every exporter renders the same
 * information (PDF centers it, Fountain writes key/value front matter, FDX has
 * its own TitlePage block, and so on).
 */
export interface TitlePage {
  title: string;
  author: string;
  contact: string;
  draftDate: string;
  copyright: string;
}

export function titlePage(metadata: MuxwMetadata): TitlePage {
  return {
    title: metadata.title.trim(),
    author: metadata.author.trim(),
    contact: metadata.contact.trim(),
    draftDate: metadata.draftDate.trim(),
    copyright: metadata.copyright.trim(),
  };
}

/** True if there is anything to put on a title page at all. */
export function hasTitlePageContent(metadata: MuxwMetadata): boolean {
  const t = titlePage(metadata);
  return !!(t.title || t.author || t.contact || t.draftDate || t.copyright);
}

/** Common export knobs. */
export interface ExportOptions {
  /** Whether to include a title page. */
  titlePage: boolean;
}

export type ExportFormat = "pdf" | "docx" | "fdx" | "fountain" | "txt";
