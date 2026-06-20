import { useEffect, useMemo, useRef, useState } from "react";
import { parseCitations, type ChatMessage, type Mentionable } from "../../lib/ai";
import type { EditorSelection } from "../editor/Editor";
import { useSpeechInput } from "./useSpeechInput";
import "./sidebar.css";

interface SidebarProps {
  messages: ChatMessage[];
  busy: boolean;
  error: string | null;
  hasKey: boolean;
  mentionables: Mentionable[];
  selection: EditorSelection | null;
  onSend: (text: string) => void;
  onOpenSettings: () => void;
  onClearSelection: () => void;
  onJumpToScene: (index: number) => void;
}

/** Renders an assistant reply with "Scene N" citations as jump links. */
function ReplyBody({
  text,
  onJumpToScene,
}: {
  text: string;
  onJumpToScene: (index: number) => void;
}) {
  return (
    <div className="msg__body">
      {parseCitations(text).map((seg, i) =>
        seg.type === "scene" ? (
          <button
            key={i}
            type="button"
            className="citation"
            onClick={() => onJumpToScene(seg.index)}
            title={`Jump to Scene ${seg.index}`}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
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
  onSend,
  onOpenSettings,
  onClearSelection,
  onJumpToScene,
}: SidebarProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechInput((text) => {
    setDraft((d) => (d ? `${d} ${text}` : text));
  });

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
