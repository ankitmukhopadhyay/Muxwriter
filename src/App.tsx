import { useState } from "react";
import { Editor } from "./components/editor/Editor";
import {
  fountainToElements,
  SAMPLE_SCRIPT,
  type ScriptElement,
} from "./lib/fountain";
import "./App.css";

function App() {
  const [elements, setElements] = useState<ScriptElement[]>(() =>
    fountainToElements(SAMPLE_SCRIPT),
  );

  return (
    <div className="app-shell">
      <Editor elements={elements} onChange={setElements} />
    </div>
  );
}

export default App;
