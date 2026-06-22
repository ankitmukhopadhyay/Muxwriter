import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

/**
 * A tiny named file store for app managed JSON (saved chats, crash recovery).
 *
 * In the desktop app the data lives in the OS app data directory via Rust; in
 * a dev browser it falls back to localStorage under a namespaced key. Reading a
 * missing file returns an empty string so callers can treat "absent" and
 * "empty" the same way.
 */

const LS_PREFIX = "muxwriter.file.";

export async function readAppFile(name: string): Promise<string> {
  try {
    if (isTauri()) return await invoke<string>("read_app_file", { name });
    return localStorage.getItem(LS_PREFIX + name) ?? "";
  } catch {
    return "";
  }
}

export async function writeAppFile(
  name: string,
  contents: string,
): Promise<void> {
  if (isTauri()) {
    await invoke("write_app_file", { name, contents });
  } else {
    localStorage.setItem(LS_PREFIX + name, contents);
  }
}

export async function deleteAppFile(name: string): Promise<void> {
  if (isTauri()) {
    await invoke("delete_app_file", { name });
  } else {
    localStorage.removeItem(LS_PREFIX + name);
  }
}
