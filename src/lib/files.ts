import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { fountainToElements, type ScriptElement } from "./fountain";
import {
  emptyMetadata,
  parseMuxw,
  serializeMuxw,
  type MuxwMetadata,
} from "./muxw";
import { isTauri } from "./platform";

/**
 * `.muxw` file IO. The save/open dialogs are filtered to `.muxw` (with a
 * Fountain import option), and read/write go through Tauri: the dialog plugin
 * picks the path, Rust commands touch the disk.
 */

const MUXW_FILTERS = [
  { name: "Muxwriter Screenplay", extensions: ["muxw"] },
  { name: "Fountain Screenplay", extensions: ["fountain"] },
  { name: "All Files", extensions: ["*"] },
];

export interface OpenedScript {
  /** The source path, or null for imported content that has no .muxw yet. */
  path: string | null;
  metadata: MuxwMetadata;
  elements: ScriptElement[];
}

/** Derives the bare file name from a full path for display in the title bar. */
export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** Reads and parses a `.muxw` (or plain Fountain) file at a known path. */
export async function readScript(path: string): Promise<OpenedScript> {
  const text = await invoke<string>("read_text_file", { path });
  const { metadata, elements } = parseMuxw(text);
  return { path, metadata, elements };
}

/** Prompts for a file and returns its parsed document, or null if cancelled. */
export async function openScript(): Promise<OpenedScript | null> {
  const selected = await open({ multiple: false, filters: MUXW_FILTERS });
  if (typeof selected !== "string") return null;
  return readScript(selected);
}

/** Writes metadata and elements as `.muxw` text to an existing path. */
export async function writeScript(
  path: string,
  metadata: MuxwMetadata,
  elements: ScriptElement[],
): Promise<void> {
  await invoke("write_text_file", {
    path,
    contents: serializeMuxw(metadata, elements),
  });
}

const IMPORT_FILTERS = [
  { name: "Screenplay", extensions: ["fountain", "pdf", "muxw", "txt"] },
  { name: "All Files", extensions: ["*"] },
];

/** True if the parsed elements look like a screenplay (has headings or cues). */
function looksLikeScreenplay(elements: ScriptElement[]): boolean {
  return elements.some(
    (e) => e.type === "scene_heading" || e.type === "character",
  );
}

/**
 * Imports a screenplay from a Fountain or PDF file into a new, untitled
 * document. PDFs are converted to Fountain text first. Throws a readable error
 * if the file does not look like a screenplay so the caller can show it.
 */
export async function importScript(): Promise<OpenedScript | null> {
  const selected = await open({ multiple: false, filters: IMPORT_FILTERS });
  if (typeof selected !== "string") return null;

  const lower = selected.toLowerCase();
  let elements: ScriptElement[];
  let metadata: MuxwMetadata = emptyMetadata();

  if (lower.endsWith(".pdf")) {
    if (!isTauri()) {
      throw new Error("PDF import is only available in the desktop app.");
    }
    const bytes = await invoke<number[]>("read_binary_file", {
      path: selected,
    });
    const buffer = new Uint8Array(bytes).buffer;
    const { pdfToFountain } = await import("./import/pdf");
    const fountain = await pdfToFountain(buffer);
    if (!fountain.trim()) {
      throw new Error("That PDF has no extractable text. It may be scanned.");
    }
    elements = fountainToElements(fountain);
  } else {
    const text = await invoke<string>("read_text_file", { path: selected });
    const doc = parseMuxw(text);
    elements = doc.elements;
    metadata = doc.metadata;
  }

  if (!looksLikeScreenplay(elements)) {
    throw new Error(
      "That file does not look like a screenplay. No scene headings or character cues were found.",
    );
  }

  // Imported content opens as a new untitled document (saved later as .muxw).
  return { path: null, metadata, elements };
}

/** Prompts for a save location, returning the chosen path or null. */
export async function chooseSavePath(): Promise<string | null> {
  const path = await save({
    filters: MUXW_FILTERS,
    defaultPath: "Untitled.muxw",
  });
  return path ?? null;
}
