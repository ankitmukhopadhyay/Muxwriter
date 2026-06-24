import { useState } from "react";
import type { ScriptElement } from "../../lib/fountain";
import type { MuxwMetadata } from "../../lib/muxw";
import {
  EXPORT_FORMATS,
  hasTitlePageContent,
  runExport,
  type ExportFormat,
} from "../../lib/export";
import "./export.css";

interface ExportDialogProps {
  elements: ScriptElement[];
  metadata: MuxwMetadata;
  onClose: () => void;
  onDone: (message: string) => void;
}

/**
 * Picks an export format and whether to include a title page, then runs the
 * export. Mirrors the multi format export pro tools like Celtx are known for.
 */
export function ExportDialog({
  elements,
  metadata,
  onClose,
  onDone,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [titlePage, setTitlePage] = useState(hasTitlePageContent(metadata));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = EXPORT_FORMATS.find((f) => f.id === format);

  const doExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const ok = await runExport(format, elements, metadata, { titlePage });
      if (ok) {
        onDone(`Exported as ${active?.label ?? format.toUpperCase()}.`);
        onClose();
      } else {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Export</h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>

        <div className="modal__body">
          <div className="exportfmt" role="radiogroup" aria-label="Export format">
            {EXPORT_FORMATS.map((f) => (
              <button
                key={f.id}
                type="button"
                role="radio"
                aria-checked={format === f.id}
                className={`exportfmt__item${
                  format === f.id ? " exportfmt__item--active" : ""
                }`}
                onClick={() => setFormat(f.id)}
              >
                <span className="exportfmt__label">{f.label}</span>
                <span className="exportfmt__hint">{f.hint}</span>
              </button>
            ))}
          </div>

          <label className="exportopt">
            <input
              type="checkbox"
              checked={titlePage}
              onChange={(e) => setTitlePage(e.target.checked)}
            />
            <span>Include a title page</span>
          </label>

          {error && <div className="exportfmt__error">{error}</div>}
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => void doExport()}
            disabled={busy}
          >
            {busy ? "Exporting…" : "Export"}
          </button>
        </footer>
      </div>
    </div>
  );
}
