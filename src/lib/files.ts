import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  elementsToFountain,
  fountainToElements,
  type ScriptElement,
} from "./fountain";

/**
 * Plain Fountain file IO for Phase 1. The save/open dialogs and read/write go
 * through Tauri (dialog plugin to pick the path, Rust commands to touch disk).
 * Phase 2 wraps this with the `.muxw` metadata format.
 */

const FOUNTAIN_FILTERS = [
  { name: "Fountain Screenplay", extensions: ["fountain"] },
  { name: "All Files", extensions: ["*"] },
];

export interface OpenedScript {
  path: string;
  elements: ScriptElement[];
}

/** Derives the bare file name from a full path for display in the title bar. */
export function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** Prompts for a file and returns its parsed elements, or null if cancelled. */
export async function openScript(): Promise<OpenedScript | null> {
  const selected = await open({ multiple: false, filters: FOUNTAIN_FILTERS });
  if (typeof selected !== "string") return null;
  const text = await invoke<string>("read_text_file", { path: selected });
  return { path: selected, elements: fountainToElements(text) };
}

/** Writes the elements as Fountain text to an existing path. */
export async function writeScript(
  path: string,
  elements: ScriptElement[],
): Promise<void> {
  await invoke("write_text_file", {
    path,
    contents: elementsToFountain(elements),
  });
}

/** Prompts for a save location, returning the chosen path or null. */
export async function chooseSavePath(): Promise<string | null> {
  const path = await save({
    filters: FOUNTAIN_FILTERS,
    defaultPath: "Untitled.fountain",
  });
  return path ?? null;
}
