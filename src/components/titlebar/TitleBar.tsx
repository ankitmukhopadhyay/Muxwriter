import type { RuntimeEstimate } from "../../lib/fountain";
import { appWindow } from "../../lib/platform";
import "./titlebar.css";

interface TitleBarProps {
  fileName: string | null;
  dirty: boolean;
  runtime: RuntimeEstimate;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
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
  onNew,
  onOpen,
  onSave,
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
        <button type="button" className="ghostbtn" onClick={onNew} title="New (Ctrl+N)">
          New
        </button>
        <button type="button" className="ghostbtn" onClick={onOpen} title="Open (Ctrl+O)">
          Open
        </button>
        <button type="button" className="ghostbtn" onClick={onSave} title="Save (Ctrl+S)">
          Save
        </button>
      </div>

      <div className="titlebar__center" data-tauri-drag-region>
        <span className="titlebar__file">
          {fileName ?? "Untitled"}
          {dirty && <span className="titlebar__dirty" title="Unsaved changes" />}
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
