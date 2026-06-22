import type { ChatMessage } from "./ai";
import { readAppFile, writeAppFile } from "./store";

/**
 * Saved brainstorm conversations.
 *
 * Every conversation with the AI partner is a `ChatSession`: a titled,
 * timestamped list of messages. The whole list is persisted as one JSON file
 * in the app data store, so a writer can start fresh, return to an earlier
 * thread, or delete one, and have it all survive a restart.
 */

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

const CHATS_FILE = "chats.json";

/** A fresh, empty session with a process unique id. */
export function newChatSession(): ChatSession {
  const now = Date.now();
  return {
    id: `chat_${now.toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    title: "New chat",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** A short title derived from the first thing the writer asked. */
export function deriveTitle(messages: ChatMessage[]): string {
  const first = messages.find((m) => m.role === "user");
  if (!first) return "New chat";
  const text = first.content.trim().replace(/\s+/g, " ");
  if (!text) return "New chat";
  return text.length > 48 ? `${text.slice(0, 47).trimEnd()}…` : text;
}

function coerceMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const role = o.role === "assistant" ? "assistant" : "user";
  if (typeof o.content !== "string") return null;
  return { role, content: o.content };
}

function coerceSession(raw: unknown): ChatSession | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const messages = Array.isArray(o.messages)
    ? o.messages.map(coerceMessage).filter((m): m is ChatMessage => m !== null)
    : [];
  const createdAt = typeof o.createdAt === "number" ? o.createdAt : Date.now();
  return {
    id: o.id,
    title: typeof o.title === "string" && o.title ? o.title : deriveTitle(messages),
    messages,
    createdAt,
    updatedAt: typeof o.updatedAt === "number" ? o.updatedAt : createdAt,
  };
}

/** Loads all saved sessions, most recently updated first. */
export async function loadChats(): Promise<ChatSession[]> {
  const raw = await readAppFile(CHATS_FILE);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(coerceSession)
      .filter((s): s is ChatSession => s !== null)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

/** Persists the full list of sessions. */
export async function saveChats(chats: ChatSession[]): Promise<void> {
  await writeAppFile(CHATS_FILE, JSON.stringify(chats));
}
