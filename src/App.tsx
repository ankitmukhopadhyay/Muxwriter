import "./App.css";

/**
 * Phase 0 shell.
 *
 * This is a deliberately minimal branded surface that proves the design
 * tokens and font stack load correctly. The real three pane workspace
 * (element rail, script page, AI sidebar) arrives in Phase 1.
 */
function App() {
  return (
    <div className="app-shell">
      <main className="splash">
        <p className="splash__eyebrow">Screenwriting, with a partner</p>
        <h1 className="splash__wordmark">Muxwriter</h1>
        <p className="splash__tagline">
          A strict industry format script editor paired with an AI
          brainstorming partner who actually knows your story.
        </p>
        <div className="splash__specimen">
          <span style={{ fontFamily: "var(--font-display)" }}>Fraunces</span>
          <span style={{ fontFamily: "var(--font-ui)" }}>Inter</span>
          <span style={{ fontFamily: "var(--font-script)" }}>Courier Prime</span>
        </div>
      </main>
    </div>
  );
}

export default App;
