import type { RuntimeEstimate } from "../../lib/fountain";
import type { Theme } from "../../lib/settings";
import { appWindow } from "../../lib/platform";
import "./titlebar.css";

interface TitleBarProps {
  fileName: string | null;
  dirty: boolean;
  runtime: RuntimeEstimate;
  theme: Theme;
  onNew: () => void;
  onOpen: () => void;
  onImport: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onNotes: () => void;
  onInsights: () => void;
  onExport: () => void;
  onToggleOutline: () => void;
  outlineOpen: boolean;
  onToggleTheme: () => void;
}

/**
 * Custom frameless title bar. The bar and its non interactive regions carry
 * `data-tauri-drag-region` so the window can be dragged from them; the window
 * controls and runtime pill are interactive and deliberately omit it.
 */
export function TitleBar({
  fileName,
  dirty,
  runtime,
  theme,
  onNew,
  onOpen,
  onImport,
  onSave,
  onSaveAs,
  onNotes,
  onInsights,
  onExport,
  onToggleOutline,
  outlineOpen,
  onToggleTheme,
}: TitleBarProps) {
  const minimize = () => void appWindow()?.minimize();
  const toggleMaximize = () => void appWindow()?.toggleMaximize();
  const close = () => void appWindow()?.close();

  return (
    <header className="titlebar" data-tauri-drag-region>
      <div className="titlebar__brand" data-tauri-drag-region>
        <span className="titlebar__mark" aria-hidden>
          M
        </span>
        <span className="titlebar__wordmark">Muxwriter</span>
      </div>

      <div className="titlebar__actions">
        <button
          type="button"
          className={`ghostbtn${outlineOpen ? " ghostbtn--active" : ""}`}
          onClick={onToggleOutline}
          title="Toggle the scene navigator"
        >
          Scenes
        </button>
        <span className="titlebar__divider" />
        <button type="button" className="ghostbtn" onClick={onNew} title="New (Ctrl+N)">
          New
        </button>
        <button type="button" className="ghostbtn" onClick={onOpen} title="Open (Ctrl+O)">
          Open
        </button>
        <button
          type="button"
          className="ghostbtn"
          onClick={onImport}
          title="Import a Fountain or PDF screenplay"
        >
          Import
        </button>
        <button type="button" className="ghostbtn" onClick={onSave} title="Save (Ctrl+S)">
          Save
        </button>
        <button
          type="button"
          className="ghostbtn"
          onClick={onSaveAs}
          title="Save As (Ctrl+Shift+S)"
        >
          Save As
        </button>
        <span className="titlebar__divider" />
        <button type="button" className="ghostbtn" onClick={onNotes} title="Notes">
          Notes
        </button>
        <button
          type="button"
          className="ghostbtn"
          onClick={onInsights}
          title="Insights"
        >
          Insights
        </button>
        <button
          type="button"
          className="ghostbtn"
          onClick={onExport}
          title="Export the screenplay (PDF, Word, Final Draft, Fountain, text)"
        >
          Export
        </button>
      </div>

      <div className="titlebar__center" data-tauri-drag-region>
        <span className="titlebar__file">
          {fileName ?? "Untitled"}
          {dirty && (
            <span className="titlebar__asterisk" title="Unsaved changes">
              *
            </span>
          )}
        </span>
      </div>

      <div className="titlebar__right">
        <span
          className="titlebar__runtime"
          title="Estimated page count and screen time"
        >
          <strong>{runtime.pagesLabel}</strong> pp
          <span className="titlebar__runtime-sep">·</span>~{runtime.minutes} min
        </span>

        <button
          type="button"
          className="winbtn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to light" : "Switch to dark"}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3.4" fill="currentColor" />
              <path
                d="M8 .8v2M8 13.2v2M.8 8h2M13.2 8h2M2.7 2.7l1.4 1.4M11.9 11.9l1.4 1.4M13.3 2.7l-1.4 1.4M4.1 11.9l-1.4 1.4"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M13.5 9.5A5.5 5.5 0 1 1 6.5 2.5a4.5 4.5 0 0 0 7 7z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        <div className="titlebar__controls">
          <button
            type="button"
            className="winbtn"
            onClick={minimize}
            aria-label="Minimize"
            title="Minimize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" />
            </svg>
          </button>
          <button
            type="button"
            className="winbtn"
            onClick={toggleMaximize}
            aria-label="Maximize"
            title="Maximize"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <rect
                x="1.5"
                y="1.5"
                width="7"
                height="7"
                fill="none"
                stroke="currentColor"
              />
            </svg>
          </button>
          <button
            type="button"
            className="winbtn winbtn--close"
            onClick={close}
            aria-label="Close"
            title="Close"
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" stroke="currentColor" />
              <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" stroke="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}
