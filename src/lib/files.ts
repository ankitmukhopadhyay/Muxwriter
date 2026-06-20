import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { ScriptElement } from "./fountain";
import {
  parseMuxw,
  serializeMuxw,
  type MuxwMetadata,
} from "./muxw";

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
  path: string;
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

/** Prompts for a save location, returning the chosen path or null. */
export async function chooseSavePath(): Promise<string | null> {
  const path = await save({
    filters: MUXW_FILTERS,
    defaultPath: "Untitled.muxw",
  });
  return path ?? null;
}
