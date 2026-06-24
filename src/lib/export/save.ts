import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { MuxwMetadata } from "../muxw";
import { isTauri } from "../platform";

/**
 * Shared save helpers for every export format. In the desktop app a native
 * dialog picks the path and Rust writes the bytes; in a browser the file
 * downloads. One place keeps every format's save behavior identical.
 */

export function exportBaseName(metadata: MuxwMetadata): string {
  const base = metadata.title?.trim() || "Untitled";
  return base.replace(/[\\/:*?"<>|]/g, "_");
}

async function pickPath(
  metadata: MuxwMetadata,
  label: string,
  ext: string,
): Promise<string | null> {
  const path = await save({
    filters: [{ name: label, extensions: [ext] }],
    defaultPath: `${exportBaseName(metadata)}.${ext}`,
  });
  return path ?? null;
}

function browserDownload(name: string, mime: string, data: BlobPart): void {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/** Saves UTF-8 text (Fountain, FDX, plain text). */
export async function saveTextExport(
  metadata: MuxwMetadata,
  label: string,
  ext: string,
  mime: string,
  contents: string,
): Promise<boolean> {
  if (isTauri()) {
    const path = await pickPath(metadata, label, ext);
    if (!path) return false;
    await invoke("write_text_file", { path, contents });
    return true;
  }
  browserDownload(`${exportBaseName(metadata)}.${ext}`, mime, contents);
  return true;
}

/** Saves binary bytes (PDF, DOCX). */
export async function saveBinaryExport(
  metadata: MuxwMetadata,
  label: string,
  ext: string,
  mime: string,
  bytes: Uint8Array,
): Promise<boolean> {
  if (isTauri()) {
    const path = await pickPath(metadata, label, ext);
    if (!path) return false;
    await invoke("write_binary_file", { path, bytes: Array.from(bytes) });
    return true;
  }
  browserDownload(`${exportBaseName(metadata)}.${ext}`, mime, bytes);
  return true;
}
