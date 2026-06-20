import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import type { ChatMessage } from "../ai";
import type { MuxwMetadata } from "../muxw";
import { isTauri } from "../platform";

/** Renders the brainstorm transcript as branded Markdown. */
export function chatToMarkdown(
  messages: ChatMessage[],
  metadata: MuxwMetadata,
): string {
  const lines: string[] = ["# Muxwriter brainstorm transcript", ""];
  if (metadata.title) lines.push(`**${metadata.title}**`, "");
  for (const m of messages) {
    lines.push(`### ${m.role === "user" ? "You" : "Partner"}`, "");
    lines.push(m.content, "");
  }
  return lines.join("\n");
}

function defaultName(metadata: MuxwMetadata): string {
  const base = metadata.title?.trim() || "Untitled";
  return `${base.replace(/[\\/:*?"<>|]/g, "_")} brainstorm.md`;
}

/** Saves the transcript as Markdown, prompting for a location. */
export async function exportChat(
  messages: ChatMessage[],
  metadata: MuxwMetadata,
): Promise<void> {
  const md = chatToMarkdown(messages, metadata);
  if (isTauri()) {
    const path = await save({
      filters: [{ name: "Markdown", extensions: ["md"] }],
      defaultPath: defaultName(metadata),
    });
    if (!path) return;
    await invoke("write_text_file", { path, contents: md });
  } else {
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = defaultName(metadata);
    a.click();
    URL.revokeObjectURL(url);
  }
}
