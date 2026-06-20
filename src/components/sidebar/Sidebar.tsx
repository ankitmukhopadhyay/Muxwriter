import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "../../lib/ai";
import { useSpeechInput } from "./useSpeechInput";
import "./sidebar.css";

interface SidebarProps {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  hasKey: boolean;
  onSend: (text: string) => void;
  onOpenSettings: () => void;
}

/**
 * The AI brainstorming panel: a text chat styled to match the editor, with a
 * composer that supports voice input. Replies are always text.
 */
export function Sidebar({
  messages,
  busy,
  error,
  hasKey,
  onSend,
  onOpenSettings,
}: SidebarProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechInput((text) => {
    setDraft((d) => (d ? `${d} ${text}` : text));
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, busy]);

  const submit = () => {
    const text = draft.trim();
    if (!text || busy) return;
    onSend(text);
    setDraft("");
  };

  return (
    <aside className="sidebar">
      <header className="sidebar__header">
        <span className="sidebar__title">Brainstorm</span>
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
      </header>

      <div className="sidebar__scroll selectable" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="sidebar__empty">
            <p>Talk through your story.</p>
            <p className="sidebar__empty-sub">
              Ask about the current scene, a character's arc, or where to go
              next. The partner reads your script.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`msg msg--${m.role}`}>
            <div className="msg__role">
              {m.role === "user" ? "You" : "Partner"}
            </div>
            <div className="msg__body">{m.content}</div>
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

      <div className="composer">
        <textarea
          className="composer__input selectable"
          placeholder="Ask your partner…"
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
        />
        <div className="composer__actions">
          {speech.supported && (
            <button
              type="button"
              className={`composer__mic${speech.listening ? " composer__mic--on" : ""}`}
              onClick={() => (speech.listening ? speech.stop() : speech.start())}
              title={speech.listening ? "Stop listening" : "Voice input"}
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
