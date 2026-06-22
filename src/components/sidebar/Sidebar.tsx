import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { linkifyScenes, type ChatMessage, type Mentionable } from "../../lib/ai";
import type { ChatSession } from "../../lib/chats";
import type { EditorSelection } from "../editor/Editor";
import { useVoiceInput } from "./useVoiceInput";
import "./sidebar.css";

interface SidebarProps {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  hasKey: boolean;
  mentionables: Mentionable[];
  selection: EditorSelection | null;
  chats: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onSend: (text: string) => void;
  onOpenSettings: () => void;
  onClearSelection: () => void;
  onJumpToScene: (index: number) => void;
  onExportChat: () => void;
  voiceReady: boolean;
  onTranscribe: (blob: Blob) => Promise<string>;
  width: number;
}

/** A short, friendly relative time like "2h ago" or "Apr 3". */
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Renders an assistant reply as markdown (bold, lists, headings, code), with
 * "Scene N" references rewritten into clickable citations that jump the editor.
 */
function ReplyBody({
  text,
  onJumpToScene,
}: {
  text: string;
  onJumpToScene: (index: number) => void;
}) {
  return (
    <div className="msg__body markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a({ href, children }) {
            if (href && href.startsWith("muxw-scene:")) {
              const index = Number(href.slice("muxw-scene:".length));
              return (
                <button
                  type="button"
                  className="citation"
                  onClick={() => onJumpToScene(index)}
                  title={`Jump to Scene ${index}`}
                >
                  {children}
                </button>
              );
            }
            return (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            );
          },
        }}
      >
        {linkifyScenes(text)}
      </ReactMarkdown>
    </div>
  );
}

export function Sidebar({
  messages,
  busy,
  error,
  hasKey,
  mentionables,
  selection,
  chats,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onSend,
  onOpenSettings,
  onClearSelection,
  onJumpToScene,
  onExportChat,
  voiceReady,
  onTranscribe,
  width,
}: SidebarProps) {
  const [draft, setDraft] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const baseDraftRef = useRef("");

  const applyTranscript = (transcript: string) => {
    const base = baseDraftRef.current;
    setDraft(base ? `${base} ${transcript}` : transcript);
  };

  const voice = useVoiceInput({
    transcribe: onTranscribe,
    onPartial: applyTranscript,
    onResult: applyTranscript,
    onError: (message) => setMicError(message),
  });

  const handleMic = () => {
    if (voice.state === "idle") {
      if (!voiceReady) {
        setMicError(
          "Voice input needs an OpenAI API key. Add one in Settings (it works even with an Anthropic chat provider).",
        );
        return;
      }
      baseDraftRef.current = draft;
      setMicError(null);
    }
    voice.toggle();
  };

  const micStatus =
    voice.state === "recording"
      ? "Listening… speak, then click the mic to finish"
      : voice.state === "transcribing"
        ? "Finishing transcription…"
        : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  // @ mention autocomplete: active when the draft ends with @query.
  const mentionQuery = useMemo(() => {
    const m = draft.match(/@([\w]*)$/);
    return m ? m[1].toLowerCase() : null;
  }, [draft]);

  const menuItems = useMemo(() => {
    if (mentionQuery === null) return [];
    return mentionables
      .filter((item) => item.label.toLowerCase().includes(mentionQuery))
      .slice(0, 6);
  }, [mentionQuery, mentionables]);

  const pickMention = (item: Mentionable) => {
    setDraft((d) => d.replace(/@([\w]*)$/, `${item.token} `));
  };

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    onSend(text);
    setDraft("");
  };

  return (
    <aside className="sidebar" style={{ width }}>
      <header className="sidebar__header">
        <span className="sidebar__title">Brainstorm</span>
        <div className="sidebar__headeractions">
          <button
            type="button"
            className="sidebar__settings"
            onClick={onNewChat}
            title="New chat"
            aria-label="New chat"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3v10M3 8h10"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`sidebar__settings${historyOpen ? " sidebar__settings--active" : ""}`}
            onClick={() => setHistoryOpen((v) => !v)}
            title="Chat history"
            aria-label="Chat history"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
              <path
                d="M8 4.5V8l2.5 1.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              className="sidebar__settings"
              onClick={onExportChat}
              title="Export transcript"
              aria-label="Export transcript"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 1.5v8M5 6.5l3 3 3-3M2.5 12.5h11"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="sidebar__settings"
            onClick={onOpenSettings}
            title="Settings"
            aria-label="Settings"
          >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.3" />
            <path
              d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          </button>
        </div>
      </header>

      {historyOpen && (
        <div className="chathistory">
          {chats.length === 0 ? (
            <div className="chathistory__empty">No saved chats yet.</div>
          ) : (
            chats.map((c) => (
              <div
                key={c.id}
                className={`chathistory__item${
                  c.id === activeChatId ? " chathistory__item--active" : ""
                }`}
              >
                <button
                  type="button"
                  className="chathistory__open"
                  onClick={() => {
                    onSelectChat(c.id);
                    setHistoryOpen(false);
                  }}
                  title={c.title}
                >
                  <span className="chathistory__name">{c.title}</span>
                  <span className="chathistory__time">
                    {relativeTime(c.updatedAt)}
                  </span>
                </button>
                <button
                  type="button"
                  className="chathistory__delete"
                  onClick={() => onDeleteChat(c.id)}
                  title="Delete chat"
                  aria-label={`Delete chat ${c.title}`}
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <div className="sidebar__scroll selectable" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="sidebar__empty">
            <p>Talk through your story.</p>
            <p className="sidebar__empty-sub">
              Ask about the current scene, mention <code>@Scene 2</code> or a
              character, or highlight a line and ask. The partner reads your
              script and cites scenes you can jump to.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <div className="msg__role">
              {m.role === "user" ? "You" : "Partner"}
            </div>
            {m.role === "assistant" ? (
              <ReplyBody text={m.content} onJumpToScene={onJumpToScene} />
            ) : (
              <div className="msg__body">{m.content}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="msg msg--assistant">
            <div className="msg__role">Partner</div>
            <div className="msg__body msg__thinking">thinking…</div>
          </div>
        )}
        {error && <div className="sidebar__error">{error}</div>}
      </div>

      {!hasKey && (
        <button
          type="button"
          className="sidebar__keynotice"
          onClick={onOpenSettings}
        >
          Add your API key to start brainstorming →
        </button>
      )}

      {selection && (
        <div className="selchip">
          <span className="selchip__text">
            Asking about selection in Scene {selection.sceneIndex}
          </span>
          <button
            type="button"
            className="selchip__clear"
            onClick={onClearSelection}
            aria-label="Clear selection"
          >
            ✕
          </button>
        </div>
      )}

      <div className="composer">
        {menuItems.length > 0 && (
          <div className="mentionmenu">
            {menuItems.map((item) => (
              <button
                key={item.token}
                type="button"
                className="mentionmenu__item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  pickMention(item);
                }}
              >
                <span className={`mentionmenu__kind mentionmenu__kind--${item.kind}`}>
                  {item.kind === "scene" ? "S" : "C"}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        )}
        {(micStatus || micError) && (
          <div
            className={`composer__status${micError ? " composer__status--error" : ""}`}
          >
            {micError ?? micStatus}
          </div>
        )}
        <textarea
          className="composer__input selectable"
          placeholder="Ask your partner…  (try @ to mention a scene)"
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && menuItems.length === 0) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer__actions">
          {voice.supported && (
            <button
              type="button"
              className={`composer__mic${voice.state === "recording" ? " composer__mic--on" : ""}`}
              onClick={handleMic}
              disabled={voice.state === "transcribing"}
              title={
                voice.state === "recording" ? "Stop recording" : "Voice input"
              }
              aria-label="Voice input"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="5.5" y="1.5" width="5" height="8" rx="2.5" fill="currentColor" />
                <path
                  d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
          <button
            type="button"
            className="composer__send"
            onClick={submit}
            disabled={busy || !draft.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </aside>
  );
}
