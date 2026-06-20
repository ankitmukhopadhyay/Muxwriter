import { invoke } from "@tauri-apps/api/core";
import { isTauri } from "./platform";

/**
 * Local, BYOK application settings. The API key is stored on disk in the app
 * config directory (in the Tauri app) or localStorage (in a dev browser) and
 * is sent only to the chosen provider, never to any Muxwriter server (there
 * isn't one).
 */

export type AiProvider = "anthropic" | "openai";

export interface AppSettings {
  provider: AiProvider;
  anthropicApiKey: string;
  openaiApiKey: string;
  /** Model id, e.g. "claude-opus-4-8". */
  model: string;
}

export const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (balanced)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast, cheap)" },
];

export const OPENAI_MODELS = [
  { id: "gpt-4o", label: "GPT-4o" },
  { id: "gpt-4o-mini", label: "GPT-4o mini" },
];

export function defaultSettings(): AppSettings {
  return {
    provider: "anthropic",
    anthropicApiKey: "",
    openaiApiKey: "",
    model: "claude-opus-4-8",
  };
}

function coerce(raw: unknown): AppSettings {
  const base = defaultSettings();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  return {
    provider: o.provider === "openai" ? "openai" : "anthropic",
    anthropicApiKey:
      typeof o.anthropicApiKey === "string" ? o.anthropicApiKey : "",
    openaiApiKey: typeof o.openaiApiKey === "string" ? o.openaiApiKey : "",
    model: typeof o.model === "string" && o.model ? o.model : base.model,
  };
}

const LS_KEY = "muxwriter.settings";

export async function loadSettings(): Promise<AppSettings> {
  try {
    if (isTauri()) {
      const json = await invoke<string>("read_settings");
      return coerce(JSON.parse(json));
    }
    const stored = localStorage.getItem(LS_KEY);
    return coerce(stored ? JSON.parse(stored) : null);
  } catch {
    return defaultSettings();
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const json = JSON.stringify(settings, null, 2);
  if (isTauri()) {
    await invoke("write_settings", { contents: json });
  } else {
    localStorage.setItem(LS_KEY, json);
  }
}

/** The API key for the currently selected provider. */
export function activeKey(settings: AppSettings): string {
  return settings.provider === "openai"
    ? settings.openaiApiKey
    : settings.anthropicApiKey;
}
