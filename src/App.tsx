import { useEffect, useRef, useState } from "react";
import { Editor } from "./components/editor/Editor";
import { TitleBar } from "./components/titlebar/TitleBar";
import { ResizeHandles } from "./components/titlebar/ResizeHandles";
import {
  estimateRuntime,
  fountainToElements,
  SAMPLE_SCRIPT,
  type ScriptElement,
} from "./lib/fountain";
import {
  baseName,
  chooseSavePath,
  openScript,
  writeScript,
} from "./lib/files";
import "./App.css";

function App() {
  const [elements, setElements] = useState<ScriptElement[]>(() =>
    fountainToElements(SAMPLE_SCRIPT),
  );
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // Bumped on open/new so the Editor remounts with a fresh selection.
  const [docKey, setDocKey] = useState(0);

  const handleChange = (next: ScriptElement[]) => {
    setElements(next);
    setDirty(true);
  };

  const doNew = () => {
    setElements(fountainToElements(""));
    setFilePath(null);
    setDirty(false);
    setDocKey((k) => k + 1);
  };

  const doOpen = async () => {
    try {
      const result = await openScript();
      if (!result) return;
      setElements(result.elements);
      setFilePath(result.path);
      setDirty(false);
      setDocKey((k) => k + 1);
    } catch (err) {
      console.error("Failed to open script:", err);
    }
  };

  const doSaveAs = async () => {
    try {
      const path = await chooseSavePath();
      if (!path) return;
      await writeScript(path, elements);
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
      await writeScript(filePath, elements);
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
