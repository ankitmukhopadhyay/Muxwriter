import { useState } from "react";
import {
  ANTHROPIC_MODELS,
  OPENAI_MODELS,
  type AppSettings,
} from "../../lib/settings";
import "./settings.css";

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

/**
 * Local settings: provider, BYOK API key, and model. The key is stored on the
 * user's machine and sent only to the chosen provider.
 */
export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  const models = draft.provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
  const keyField =
    draft.provider === "openai" ? "openaiApiKey" : "anthropicApiKey";

  const update = (patch: Partial<AppSettings>) =>
    setDraft((d) => ({ ...d, ...patch }));

  const switchProvider = (provider: AppSettings["provider"]) => {
    const list = provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
    update({ provider, model: list[0].id });
  };

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="modal__header">
          <h2>Settings</h2>
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
          <label className="field">
            <span className="field__label">AI provider</span>
            <select
              value={draft.provider}
              onChange={(e) =>
                switchProvider(e.target.value as AppSettings["provider"])
              }
            >
              <option value="anthropic">Anthropic (Claude)</option>
              <option value="openai">OpenAI</option>
            </select>
          </label>

          <label className="field">
            <span className="field__label">
              {draft.provider === "openai" ? "OpenAI" : "Anthropic"} API key
            </span>
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder={draft.provider === "openai" ? "sk-…" : "sk-ant-…"}
              value={draft[keyField]}
              onChange={(e) => update({ [keyField]: e.target.value })}
              className="selectable"
            />
          </label>

          <label className="field">
            <span className="field__label">Model</span>
            <select
              value={draft.model}
              onChange={(e) => update({ model: e.target.value })}
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          <p className="field__note">
            Your key is stored locally on this machine and is sent only to the
            provider you choose. Muxwriter has no server.
          </p>
        </div>

        <footer className="modal__footer">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onSave(draft)}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}
