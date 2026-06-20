import OpenAI from "openai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "../platform";
import type { AppSettings } from "../settings";

/**
 * Speech to text by recording audio and transcribing it with OpenAI, rather
 * than the Web Speech API (which fails silently inside a desktop webview).
 * Transcription always uses the OpenAI key, since Anthropic has no speech
 * endpoint; the chat provider can still be Anthropic.
 */

export function canTranscribe(settings: AppSettings): boolean {
  return settings.openaiApiKey.trim().length > 0;
}

export async function transcribeAudio(
  settings: AppSettings,
  blob: Blob,
): Promise<string> {
  const key = settings.openaiApiKey.trim();
  if (!key) {
    throw new Error(
      "Voice input needs an OpenAI API key. Add one in Settings (it works even if your chat provider is Anthropic).",
    );
  }
  const httpFetch = (isTauri() ? tauriFetch : fetch) as typeof globalThis.fetch;
  const client = new OpenAI({
    apiKey: key,
    dangerouslyAllowBrowser: true,
    fetch: httpFetch,
  });

  const file = new File([blob], "speech.webm", {
    type: blob.type || "audio/webm",
  });
  const result = await client.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });
  return result.text.trim();
}
