import { useState } from "react";
import { Editor } from "./components/editor/Editor";
import { TitleBar } from "./components/titlebar/TitleBar";
import { ResizeHandles } from "./components/titlebar/ResizeHandles";
import {
  estimateRuntime,
  fountainToElements,
  SAMPLE_SCRIPT,
  type ScriptElement,
} from "./lib/fountain";
import "./App.css";

function App() {
  const [elements, setElements] = useState<ScriptElement[]>(() =>
    fountainToElements(SAMPLE_SCRIPT),
  );

  const runtime = estimateRuntime(elements);

  return (
    <div className="app-shell">
      <ResizeHandles />
      <TitleBar fileName={null} dirty={false} runtime={runtime} />
      <Editor elements={elements} onChange={setElements} />
    </div>
  );
}

export default App;
