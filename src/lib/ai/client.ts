import Anthropic from "@anthropic-ai/sdk";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "../platform";
import { activeKey, type AppSettings } from "../settings";
import type { ChatMessage } from "./types";

/**
 * Sends a brainstorming turn to the configured provider and returns the reply
 * text. The request goes directly from the app to the provider using the
 * user's key. In the Tauri shell the HTTP runs through the Rust http plugin
 * (no CORS, and the key never leaves the machine except to the provider).
 */
export async function sendChat(
  settings: AppSettings,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const key = activeKey(settings);
  if (!key) {
    throw new Error("No API key set. Open Settings and add your key.");
  }
  if (settings.provider === "openai") {
    throw new Error(
      "OpenAI support is coming soon. Switch to Anthropic in Settings for now.",
    );
  }

  // Route through Tauri's fetch in the desktop app to bypass browser CORS.
  const httpFetch = (isTauri() ? tauriFetch : fetch) as typeof globalThis.fetch;

  const client = new Anthropic({
    apiKey: key,
    dangerouslyAllowBrowser: true,
    fetch: httpFetch,
  });

  const response = await client.messages.create({
    model: settings.model,
    max_tokens: 8192,
    thinking: { type: "adaptive" },
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });

  return response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}
