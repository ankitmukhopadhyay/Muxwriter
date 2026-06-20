import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Editor } from "./components/editor/Editor";
import { TitleBar } from "./components/titlebar/TitleBar";
import { ResizeHandles } from "./components/titlebar/ResizeHandles";
import { Sidebar } from "./components/sidebar/Sidebar";
import { SettingsModal } from "./components/settings/SettingsModal";
import {
  deriveScenes,
  estimateRuntime,
  fountainToElements,
  SAMPLE_SCRIPT,
  type ScriptElement,
} from "./lib/fountain";
import { emptyMetadata, type MuxwMetadata } from "./lib/muxw";
import {
  baseName,
  chooseSavePath,
  openScript,
  readScript,
  writeScript,
} from "./lib/files";
import {
  activeKey,
  defaultSettings,
  loadSettings,
  saveSettings,
  type AppSettings,
} from "./lib/settings";
import {
  buildSystemPrompt,
  buildTurnContext,
  getMentionables,
  sendChat,
  summarizeCompletedScenes,
  type ChatMessage,
} from "./lib/ai";
import type { EditorSelection } from "./components/editor/Editor";
import { isTauri } from "./lib/platform";
import "./App.css";

function App() {
  const [elements, setElements] = useState<ScriptElement[]>(() =>
    fountainToElements(SAMPLE_SCRIPT),
  );
  const [metadata, setMetadata] = useState<MuxwMetadata>(() => emptyMetadata());
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [docKey, setDocKey] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);

  // AI partner state.
  const [settings, setSettings] = useState<AppSettings>(() => defaultSettings());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [jumpRequest, setJumpRequest] = useState<{
    index: number;
    nonce: number;
  } | null>(null);

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  const handleChange = (next: ScriptElement[]) => {
    setElements(next);
    setDirty(true);
  };

  const loadDocument = (
    nextElements: ScriptElement[],
    nextMetadata: MuxwMetadata,
    path: string | null,
  ) => {
    setElements(nextElements);
    setMetadata(nextMetadata);
    setFilePath(path);
    setDirty(false);
    setDocKey((k) => k + 1);
  };

  const doNew = () => {
    loadDocument(fountainToElements(""), emptyMetadata(), null);
  };

  const doOpen = async () => {
    try {
      const result = await openScript();
      if (!result) return;
      loadDocument(result.elements, result.metadata, result.path);
    } catch (err) {
      console.error("Failed to open script:", err);
    }
  };

  const doSaveAs = async () => {
    try {
      const path = await chooseSavePath();
      if (!path) return;
      await writeScript(path, metadata, elements);
      setFilePath(path);
      setDirty(false);
    } catch (err) {
      console.error("Failed to save script:", err);
    }
  };

  const doSave = async () => {
    if (!filePath) {
      await doSaveAs();
      return;
    }
    try {
      await writeScript(filePath, metadata, elements);
      setDirty(false);
    } catch (err) {
      console.error("Failed to save script:", err);
    }
  };

  const actions = useRef({ doSave, doOpen, doNew, doSaveAs });
  actions.current = { doSave, doOpen, doNew, doSaveAs };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s" && e.shiftKey) {
        e.preventDefault();
        void actions.current.doSaveAs();
      } else if (key === "s") {
        e.preventDefault();
        void actions.current.doSave();
      } else if (key === "o") {
        e.preventDefault();
        void actions.current.doOpen();
      } else if (key === "n") {
        e.preventDefault();
        actions.current.doNew();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    void (async () => {
      try {
        const path = await invoke<string | null>("get_launch_path");
        if (!path) return;
        const result = await readScript(path);
        loadDocument(result.elements, result.metadata, result.path);
      } catch (err) {
        console.error("Failed to open launch file:", err);
      }
    })();
  }, []);

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    void saveSettings(next);
    setSettingsOpen(false);
  };

  const currentSceneId = (() => {
    if (!activeId) return null;
    const scene = deriveScenes(elements).find((s) =>
      s.elementIds.includes(activeId),
    );
    return scene?.id ?? null;
  })();

  const handleSend = async (text: string) => {
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setChatBusy(true);
    setChatError(null);
    try {
      // Roll completed scenes into the summary log so context stays compact,
      // then assemble context from the freshest metadata.
      let meta = metadata;
      const summarized = await summarizeCompletedScenes(settings, meta, elements);
      if (summarized) {
        meta = summarized;
        setMetadata(summarized);
        setDirty(true);
      }
      const base = buildSystemPrompt(meta, elements, currentSceneId);
      const turn = buildTurnContext(elements, text, selection);
      const system = turn ? `${base}\n\n${turn}` : base;
      setSelection(null);
      const reply = await sendChat(settings, system, next, elements);
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setChatBusy(false);
    }
  };

  const runtime = estimateRuntime(elements);
  const fileName = filePath ? baseName(filePath) : null;
  const hasKey = activeKey(settings).trim().length > 0;

  return (
    <div className="app-shell">
      <ResizeHandles />
      <TitleBar
        fileName={fileName}
        dirty={dirty}
        runtime={runtime}
        onNew={doNew}
        onOpen={() => void doOpen()}
        onSave={() => void doSave()}
      />
      <div className="workspace">
        <Editor
          key={docKey}
          elements={elements}
          onChange={handleChange}
          onActiveIdChange={setActiveId}
          onSelectionChange={setSelection}
          jumpRequest={jumpRequest}
        />
        <Sidebar
          messages={messages}
          busy={chatBusy}
          error={chatError}
          hasKey={hasKey}
          mentionables={getMentionables(elements)}
          selection={selection}
          onSend={(text) => void handleSend(text)}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearSelection={() => setSelection(null)}
          onJumpToScene={(index) =>
            setJumpRequest({ index, nonce: Date.now() })
          }
        />
      </div>
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
