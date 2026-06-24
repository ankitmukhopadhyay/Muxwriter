import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Editor } from "./components/editor/Editor";
import { DiffOverlay } from "./components/editor/DiffOverlay";
import { TitleBar } from "./components/titlebar/TitleBar";
import { ResizeHandles } from "./components/titlebar/ResizeHandles";
import { Sidebar } from "./components/sidebar/Sidebar";
import { SettingsModal } from "./components/settings/SettingsModal";
import { InsightsModal } from "./components/insights/InsightsModal";
import { NotesPanel } from "./components/notes/NotesPanel";
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
  importScript,
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
  canTranscribe,
  getMentionables,
  sendChat,
  summarizeCompletedScenes,
  transcribeAudio,
  type ChatMessage,
} from "./lib/ai";
import type { EditorSelection } from "./components/editor/Editor";
import { ExportDialog } from "./components/export/ExportDialog";
import { FindReplace } from "./components/find/FindReplace";
import { StatusBar } from "./components/statusbar/StatusBar";
import { replaceAll, replaceMatch, type Match } from "./lib/find";
import { applyProposedEdit, type ProposedEdit } from "./lib/editing";
import {
  deriveTitle,
  loadChats,
  newChatSession,
  saveChats,
  type ChatSession,
} from "./lib/chats";
import {
  clearRecovery,
  readRecovery,
  restoreSnapshot,
  writeRecovery,
  type RecoverySnapshot,
} from "./lib/recovery";
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
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [selection, setSelection] = useState<EditorSelection | null>(null);
  const [jumpRequest, setJumpRequest] = useState<{
    index: number;
    nonce: number;
  } | null>(null);
  const [pendingEdits, setPendingEdits] = useState<ProposedEdit[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const [findReplaceMode, setFindReplaceMode] = useState(false);
  const [revealRequest, setRevealRequest] = useState<{
    elementId: string;
    start: number;
    end: number;
    nonce: number;
  } | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = Number(localStorage.getItem("muxwriter.sidebarWidth"));
    return saved >= 300 && saved <= 760 ? saved : 380;
  });

  // Drag the splitter to resize the brainstorm panel.
  const startSidebarResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const w = Math.max(300, Math.min(760, window.innerWidth - ev.clientX));
      setSidebarWidth(w);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setSidebarWidth((w) => {
        localStorage.setItem("muxwriter.sidebarWidth", String(w));
        return w;
      });
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  useEffect(() => {
    void loadSettings().then(setSettings);
  }, []);

  // On startup, surface any unsaved work left behind by a previous session.
  useEffect(() => {
    void readRecovery().then((snap) => {
      if (snap) setRecovery(snap);
    });
  }, []);

  // Autosave: while there are unsaved changes (and no recovery prompt is
  // waiting on a decision), snapshot the document a short beat after the last
  // edit, so a crash never loses more than a couple of seconds of work.
  useEffect(() => {
    if (!dirty || recovery) return;
    const t = setTimeout(() => {
      void writeRecovery(filePath, metadata, elements);
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, recovery, elements, metadata, filePath]);

  const recoverDocument = () => {
    if (!recovery) return;
    const { metadata: meta, elements: els } = restoreSnapshot(recovery);
    loadDocument(els, meta, recovery.path);
    setDirty(true); // recovered work is unsaved until the writer saves it
    setRecovery(null);
  };

  const discardRecovery = () => {
    void clearRecovery();
    setRecovery(null);
  };

  // Load saved chats on startup; open the most recent or start a fresh one.
  useEffect(() => {
    void loadChats().then((saved) => {
      if (saved.length > 0) {
        setChats(saved);
        setActiveChatId(saved[0].id);
        setMessages(saved[0].messages);
      } else {
        const first = newChatSession();
        setChats([first]);
        setActiveChatId(first.id);
      }
    });
  }, []);

  // Set the working transcript and write it through to the active session.
  // Only sending changes messages, so this is where persistence belongs; just
  // viewing an older chat must not bump its timestamp.
  const persistMessages = (msgs: ChatMessage[]) => {
    setMessages(msgs);
    if (!activeChatId) return;
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === activeChatId
          ? {
              ...c,
              messages: msgs,
              title: msgs.length ? deriveTitle(msgs) : c.title,
              updatedAt: Date.now(),
            }
          : c,
      );
      void saveChats(next);
      return next;
    });
  };

  const startNewChat = () => {
    const session = newChatSession();
    setChats((prev) => {
      const next = [session, ...prev];
      void saveChats(next);
      return next;
    });
    setActiveChatId(session.id);
    setMessages([]);
    setChatError(null);
    setSelection(null);
  };

  const selectChat = (id: string) => {
    const session = chats.find((c) => c.id === id);
    if (!session) return;
    setActiveChatId(id);
    setMessages(session.messages);
    setChatError(null);
  };

  const deleteChat = (id: string) => {
    let next = chats.filter((c) => c.id !== id);
    if (next.length === 0) next = [newChatSession()];
    setChats(next);
    void saveChats(next);
    if (id === activeChatId) {
      setActiveChatId(next[0].id);
      setMessages(next[0].messages);
    }
  };

  // Apply the chosen theme to the document root.
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  // Auto dismiss a notice after a few seconds.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(t);
  }, [notice]);

  const toggleTheme = () => {
    const next: AppSettings = {
      ...settings,
      theme: settings.theme === "dark" ? "light" : "dark",
    };
    setSettings(next);
    void saveSettings(next);
  };

  // Document level undo/redo. Native textarea undo does not work because the
  // textareas are controlled by React state, so the script keeps its own
  // history. Rapid typing coalesces into ~700ms steps; structural edits
  // (accepting an AI change) force a new step.
  const pastRef = useRef<ScriptElement[][]>([]);
  const futureRef = useRef<ScriptElement[][]>([]);
  const lastSnapshotRef = useRef(0);

  const commitElements = (next: ScriptElement[], boundary = false) => {
    const now = Date.now();
    if (boundary || now - lastSnapshotRef.current >= 700) {
      pastRef.current.push(elements);
      if (pastRef.current.length > 300) pastRef.current.shift();
      futureRef.current = [];
      lastSnapshotRef.current = now;
    }
    setElements(next);
    setDirty(true);
  };

  const undo = () => {
    if (pastRef.current.length === 0) return;
    futureRef.current.push(elements);
    setElements(pastRef.current.pop() as ScriptElement[]);
    setDirty(true);
    lastSnapshotRef.current = 0;
  };

  const redo = () => {
    if (futureRef.current.length === 0) return;
    pastRef.current.push(elements);
    setElements(futureRef.current.pop() as ScriptElement[]);
    setDirty(true);
    lastSnapshotRef.current = 0;
  };

  const handleChange = (next: ScriptElement[]) => {
    commitElements(next);
  };

  const loadDocument = (
    nextElements: ScriptElement[],
    nextMetadata: MuxwMetadata,
    path: string | null,
  ) => {
    pastRef.current = [];
    futureRef.current = [];
    lastSnapshotRef.current = 0;
    setElements(nextElements);
    setMetadata(nextMetadata);
    setFilePath(path);
    setDirty(false);
    setDocKey((k) => k + 1);
    setPendingEdits([]);
  };

  const doNew = () => {
    void clearRecovery();
    loadDocument(fountainToElements(""), emptyMetadata(), null);
  };

  const doOpen = async () => {
    try {
      const result = await openScript();
      if (!result) return;
      void clearRecovery();
      loadDocument(result.elements, result.metadata, result.path);
    } catch (err) {
      console.error("Failed to open script:", err);
    }
  };

  const doImport = async () => {
    try {
      const result = await importScript();
      if (!result) return;
      void clearRecovery();
      loadDocument(result.elements, result.metadata, result.path);
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Import failed.");
    }
  };

  const doSaveAs = async () => {
    try {
      const path = await chooseSavePath();
      if (!path) return;
      await writeScript(path, metadata, elements);
      setFilePath(path);
      setDirty(false);
      void clearRecovery();
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
      void clearRecovery();
    } catch (err) {
      console.error("Failed to save script:", err);
    }
  };

  // Find and replace. Reveal scrolls and selects a hit in the page; the two
  // replace paths route through commitElements so each is a single undo step.
  const revealMatch = (m: Match) => {
    setRevealRequest({
      elementId: m.elementId,
      start: m.start,
      end: m.end,
      nonce: Date.now(),
    });
  };
  const replaceOneMatch = (m: Match, replacement: string) => {
    commitElements(replaceMatch(elements, m, replacement), true);
  };
  const replaceAllMatches = (
    query: string,
    replacement: string,
    matchCase: boolean,
  ): number => {
    const { elements: next, count } = replaceAll(
      elements,
      query,
      replacement,
      matchCase,
    );
    if (count > 0) commitElements(next, true);
    return count;
  };
  const openFind = (replace: boolean) => {
    setFindReplaceMode(replace);
    setFindOpen(true);
  };

  const actions = useRef({ doSave, doOpen, doNew, doSaveAs, undo, redo, openFind });
  actions.current = { doSave, doOpen, doNew, doSaveAs, undo, redo, openFind };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "z" || key === "y") {
        // Only own undo/redo for the script. Chat and notes fields keep their
        // native textarea history, so let those events pass through. The find
        // bar is transient and has no history worth keeping, so undo there
        // should drive the document, like the editor.
        const target = e.target as HTMLElement | null;
        const cls =
          target instanceof HTMLTextAreaElement ||
          target instanceof HTMLInputElement
            ? target.className
            : null;
        const inOtherField =
          cls !== null &&
          !cls.includes("element") &&
          !cls.includes("findbar__input");
        if (inOtherField) return;
        e.preventDefault();
        if (key === "y" || (key === "z" && e.shiftKey)) {
          actions.current.redo();
        } else {
          actions.current.undo();
        }
        return;
      }
      if (key === "f") {
        e.preventDefault();
        actions.current.openFind(false);
      } else if (key === "h") {
        e.preventDefault();
        actions.current.openFind(true);
      } else if (key === "s" && e.shiftKey) {
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
    persistMessages(next);
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
      const reply = await sendChat(settings, system, next, elements, meta, {
        onProposeEdit: (edit) => setPendingEdits((p) => [...p, edit]),
        onPatchMetadata: (updater) => {
          setMetadata((m) => updater(m));
          setDirty(true);
        },
      });
      persistMessages([...next, { role: "assistant", content: reply }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : String(err));
    } finally {
      setChatBusy(false);
    }
  };

  const acceptEdit = (edit: ProposedEdit) => {
    // An accepted AI change is always its own undo step.
    commitElements(applyProposedEdit(elements, edit), true);
    setPendingEdits((p) => p.filter((e) => e.id !== edit.id));
  };
  const rejectEdit = (edit: ProposedEdit) => {
    setPendingEdits((p) => p.filter((e) => e.id !== edit.id));
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
        onImport={() => void doImport()}
        onSave={() => void doSave()}
        onSaveAs={() => void doSaveAs()}
        onNotes={() => setNotesOpen(true)}
        onInsights={() => setInsightsOpen(true)}
        onExport={() => setExportOpen(true)}
        theme={settings.theme}
        onToggleTheme={toggleTheme}
      />
      <div className="workspace">
        <div className="editor-pane">
          <Editor
            key={docKey}
            elements={elements}
            onChange={handleChange}
            onActiveIdChange={setActiveId}
            onSelectionChange={setSelection}
            jumpRequest={jumpRequest}
            revealRequest={revealRequest}
          />
          {findOpen && (
            <FindReplace
              elements={elements}
              replaceMode={findReplaceMode}
              onReveal={revealMatch}
              onReplaceOne={replaceOneMatch}
              onReplaceAll={replaceAllMatches}
              onClose={() => setFindOpen(false)}
            />
          )}
          {pendingEdits[0] && (
            <DiffOverlay
              edit={pendingEdits[0]}
              onAccept={() => acceptEdit(pendingEdits[0])}
              onReject={() => rejectEdit(pendingEdits[0])}
            />
          )}
          <StatusBar elements={elements} activeId={activeId} />
        </div>
        <div
          className="splitter"
          onMouseDown={startSidebarResize}
          role="separator"
          aria-label="Resize brainstorm panel"
        />
        <Sidebar
          messages={messages}
          busy={chatBusy}
          error={chatError}
          hasKey={hasKey}
          mentionables={getMentionables(elements)}
          selection={selection}
          chats={chats}
          activeChatId={activeChatId}
          onNewChat={startNewChat}
          onSelectChat={selectChat}
          onDeleteChat={deleteChat}
          onSend={(text) => void handleSend(text)}
          onOpenSettings={() => setSettingsOpen(true)}
          onClearSelection={() => setSelection(null)}
          onJumpToScene={(index) =>
            setJumpRequest({ index, nonce: Date.now() })
          }
          onExportChat={() =>
            void import("./lib/export").then((m) =>
              m.exportChat(messages, metadata),
            )
          }
          voiceReady={canTranscribe(settings)}
          onTranscribe={(blob) => transcribeAudio(settings, blob)}
          width={sidebarWidth}
        />
      </div>
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {insightsOpen && (
        <InsightsModal
          elements={elements}
          onClose={() => setInsightsOpen(false)}
        />
      )}
      {notesOpen && (
        <NotesPanel
          metadata={metadata}
          elements={elements}
          onChange={(next) => {
            setMetadata(next);
            setDirty(true);
          }}
          onClose={() => setNotesOpen(false)}
        />
      )}
      {exportOpen && (
        <ExportDialog
          elements={elements}
          metadata={metadata}
          onClose={() => setExportOpen(false)}
          onDone={(message) => setNotice(message)}
        />
      )}
      {notice && (
        <div className="toast" role="alert" onClick={() => setNotice(null)}>
          {notice}
        </div>
      )}
      {recovery && (
        <div className="recoverybar" role="alertdialog">
          <span className="recoverybar__text">
            Unsaved work from your last session was found
            {recovery.path ? ` (${baseName(recovery.path)})` : ""}.
          </span>
          <div className="recoverybar__actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={recoverDocument}
            >
              Recover
            </button>
            <button type="button" className="btn" onClick={discardRecovery}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
