import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * True when running inside the Tauri shell rather than a plain browser.
 * The editor runs in a normal browser during development, so any call into
 * native window or file APIs must be guarded by this.
 */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** The native window handle, or null when running in a plain browser. */
export function appWindow() {
  return isTauri() ? getCurrentWindow() : null;
}
