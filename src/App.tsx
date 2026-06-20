import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Editor } from "./components/editor/Editor";
import { TitleBar } from "./components/titlebar/TitleBar";
import { ResizeHandles } from "./components/titlebar/ResizeHandles";
import {
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
import { isTauri } from "./lib/platform";
import "./App.css";

function App() {
  const [elements, setElements] = useState<ScriptElement[]>(() =>
    fountainToElements(SAMPLE_SCRIPT),
  );
  const [metadata, setMetadata] = useState<MuxwMetadata>(() => emptyMetadata());
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // Bumped on open/new so the Editor remounts with a fresh selection.
  const [docKey, setDocKey] = useState(0);

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

  // Keep the latest handlers in a ref so the global shortcut listener never
  // goes stale without rebinding on every keystroke.
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

  // On startup, open the file the app was launched with (double clicked .muxw).
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

  const runtime = estimateRuntime(elements);
  const fileName = filePath ? baseName(filePath) : null;

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
      <Editor key={docKey} elements={elements} onChange={handleChange} />
    </div>
  );
}

export default App;
