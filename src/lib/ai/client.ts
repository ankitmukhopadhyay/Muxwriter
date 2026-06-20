import Anthropic from "@anthropic-ai/sdk";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "../platform";
import { activeKey, type AppSettings } from "../settings";
import type { ScriptElement } from "../fountain";
import type { ChatMessage } from "./types";
import { TOOLS, runTool } from "./tools";

/** Builds an Anthropic client that routes HTTP through Tauri (no CORS). */
function makeClient(settings: AppSettings): Anthropic {
  const httpFetch = (isTauri() ? tauriFetch : fetch) as typeof globalThis.fetch;
  return new Anthropic({
    apiKey: activeKey(settings),
    dangerouslyAllowBrowser: true,
    fetch: httpFetch,
  });
}

function requireReady(settings: AppSettings): void {
  if (!activeKey(settings)) {
    throw new Error("No API key set. Open Settings and add your key.");
  }
  if (settings.provider === "openai") {
    throw new Error(
      "OpenAI support is coming soon. Switch to Anthropic in Settings for now.",
    );
  }
}

function textOf(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/** Max agentic loop iterations before giving up, to bound cost. */
const MAX_TURNS = 6;

/**
 * Sends a brainstorming turn and returns the reply text, running the agentic
 * tool loop: the model may call search_script / get_scene to pull in past
 * scenes on its own, and we feed the results back until it answers.
 */
export async function sendChat(
  settings: AppSettings,
  systemPrompt: string,
  messages: ChatMessage[],
  elements: ScriptElement[],
): Promise<string> {
  requireReady(settings);
  const client = makeClient(settings);

  const convo: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.messages.create({
      model: settings.model,
      max_tokens: 8192,
      thinking: { type: "adaptive" },
      system: systemPrompt,
      tools: TOOLS,
      messages: convo,
    });

    if (response.stop_reason !== "tool_use") {
      return textOf(response.content);
    }

    // Echo the assistant turn (including thinking + tool_use) back verbatim.
    convo.push({ role: "assistant", content: response.content });

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        const output = runTool(
          block.name,
          block.input as Record<string, unknown>,
          elements,
        );
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: output,
        });
      }
    }
    convo.push({ role: "user", content: results });
  }

  return "(The partner kept searching the script without reaching an answer. Try narrowing the question.)";
}

export { makeClient };
