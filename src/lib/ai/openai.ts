import OpenAI from "openai";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import { isTauri } from "../platform";
import { activeKey, type AppSettings } from "../settings";
import type { ScriptElement } from "../fountain";
import { buildProposedEdit, type ProposedEdit } from "../editing";
import type { ChatMessage } from "./types";
import { TOOLS, runTool } from "./tools";

/**
 * OpenAI provider. Mirrors the Anthropic path but speaks Chat Completions:
 * tool calls arrive on the assistant message and results go back as role
 * "tool" messages. The shared TOOLS definitions are remapped to OpenAI's
 * function tool shape. HTTP is routed through Tauri's fetch (no CORS, key
 * stays local).
 */

function makeClient(settings: AppSettings): OpenAI {
  const httpFetch = (isTauri() ? tauriFetch : fetch) as typeof globalThis.fetch;
  return new OpenAI({
    apiKey: activeKey(settings),
    dangerouslyAllowBrowser: true,
    fetch: httpFetch,
  });
}

const OPENAI_TOOLS: OpenAI.Chat.ChatCompletionTool[] = TOOLS.map((t) => ({
  type: "function",
  function: {
    name: t.name,
    description: t.description,
    parameters: t.input_schema as Record<string, unknown>,
  },
}));

const MAX_TURNS = 6;

export async function openaiChat(
  settings: AppSettings,
  systemPrompt: string,
  messages: ChatMessage[],
  elements: ScriptElement[],
  onProposeEdit?: (edit: ProposedEdit) => void,
): Promise<string> {
  const client = makeClient(settings);
  const convo: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await client.chat.completions.create({
      model: settings.model,
      messages: convo,
      tools: OPENAI_TOOLS,
    });
    const choice = response.choices[0]?.message;
    if (!choice) return "";

    const toolCalls = choice.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return (choice.content ?? "").trim();
    }

    convo.push(choice);
    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }
      let output: string;
      if (call.function.name === "propose_edit") {
        const edit = buildProposedEdit(elements, args);
        if (edit && onProposeEdit) {
          onProposeEdit(edit);
          output = `Proposed a revision to Scene ${edit.sceneIndex}. The writer will accept or reject it in the editor.`;
        } else {
          output = "Could not locate that scene to edit.";
        }
      } else {
        output = runTool(call.function.name, args, elements);
      }
      convo.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }

  return "(The partner kept searching the script without reaching an answer. Try narrowing the question.)";
}

/** One shot completion used for background scene summaries. */
export async function openaiComplete(
  settings: AppSettings,
  systemPrompt: string,
  userText: string,
): Promise<string> {
  const client = makeClient(settings);
  const response = await client.chat.completions.create({
    model: settings.model,
    max_tokens: 256,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userText },
    ],
  });
  return (response.choices[0]?.message?.content ?? "").trim();
}
