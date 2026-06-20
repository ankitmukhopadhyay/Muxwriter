# Muxwriter — Build Plan

Companion document to `muxwriter-spec.md`. That file covers *what* to build;
this one covers *how* and *in what order* — tech stack, repo structure,
phased implementation, and the full release pipeline.

## 1. Tech Stack

- **Shell**: Tauri 2.x (Rust)
- **Frontend**: React + Vite
- **Styling**: CSS variables implementing the established design tokens
  (graphite chrome / cream page / brass accent), Fraunces + Inter + Courier
  Prime font stack
- **Script parsing**: a Fountain parser (e.g. `fountain-js`) converting raw
  text into structured elements that formatting, export, and insights all
  read from
- **AI calls**: direct HTTPS requests from the app to the Anthropic/OpenAI
  API using the user's locally stored key — no backend server, BYOK
- **PDF export**: reference the layout logic of existing open-source
  Fountain-to-PDF tools (Afterwriting, screenplain) rather than building
  margin math from scratch
- **Speech-to-text**: Web Speech API, running inside Tauri's WebView2
  (Windows)

## 2. Repository Structure

```
muxwriter/
├── src/                      # frontend (React)
│   ├── components/
│   │   ├── editor/           # script page, element-type rail
│   │   ├── sidebar/          # AI brainstorm chat panel
│   │   ├── insights/         # character/scene reports
│   │   ├── notes/            # notes panel
│   │   └── titlebar/         # custom window chrome
│   ├── lib/
│   │   ├── fountain/         # parsing + serialization
│   │   ├── muxw/             # .muxw read/write, front-matter schema
│   │   └── ai/               # context assembly, tool definitions, API client
│   └── styles/               # design tokens (CSS variables)
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── fs.rs             # local file read/write
│   │   ├── pdf.rs            # PDF export
│   │   └── commands.rs       # Tauri commands exposed to the frontend
│   └── tauri.conf.json       # bundler config, file associations, icons
├── .github/
│   └── workflows/
│       └── release.yml       # build + release pipeline
├── docs/
│   └── muxwriter-spec.md
├── README.md
├── LICENSE
└── CONTRIBUTING.md
```

## 3. Build Phases

**Phase 0 — Scaffolding**
- Initialize the Tauri + React/Vite project
- Set up design tokens (CSS variables: graphite chrome, cream page, brass
  accent; load Fraunces/Inter/Courier Prime)
- Repo hygiene: permissive open-source license (MIT), README skeleton,
  `.gitignore`, `CONTRIBUTING.md`
- Basic CI: lint + build check on every PR, separate from the release
  workflow

**Phase 1 — Core Editor** *(first usable milestone)*
- Integrate the Fountain parser
- Editor UI: cream page, Courier Prime, element-type rail, tab/enter
  cycling between element types
- Custom frameless title bar + window controls
- Local save/load (plain Fountain text first, before the `.muxw` wrapper)
- Milestone: can write and save a properly formatted screenplay locally

**Phase 2 — `.muxw` Format**
- Define the front-matter schema precisely (story bible fields, scene log
  structure, notes structure) as a JSON/YAML block above the Fountain body
- Save/Open dialogs filtered to `.muxw`
- File association registered in `tauri.conf.json` (Windows NSIS/WiX) with
  a custom file-type icon
- Milestone: double-clicking a `.muxw` file opens it in Muxwriter

**Phase 3 — AI Partner (BYOK)**
- Settings screen for local API key entry
- Chat sidebar UI (per the established mockup)
- Direct API calls from the app to the provider
- Context assembly: story bible + rolling summary + current scene
- Voice input via the mic icon
- Milestone: a grounded conversation about the current scene works

**Phase 4 — Agentic Tools**
- `search_script(query)` / `get_scene(scene_id)` tool definitions
- Background auto-summarization of completed scenes into the rolling log
- Wire tool calls and results into the conversation loop
- Milestone: the AI pulls in a specific past scene on its own when the
  user references it

**Phase 5 — Selection, Citation, Direct Editing**
- Highlight-to-ask context bundling
- `@` mention autocomplete for scenes/characters in the composer
- Clickable citations in AI replies that jump the editor to that location
- `propose_edit` tool + diff overlay (strikethrough/highlight in the brass
  accent) + explicit accept/reject controls — no silent auto-apply
- Milestone: the AI can suggest an edit and the user can approve it in
  place

**Phase 6 — Insights & Notes**
- Character/scene breakdown reports, derived from the already-parsed
  structure
- Notes panel: per-scene/character notes + freeform global notes
- Both stored in the `.muxw` metadata block

**Phase 7 — Export**
- PDF export with screenplay-accurate margins/spacing (12pt Courier)
- Chat transcript export (Markdown or PDF, branded consistently)

**Phase 8 — Polish**
- Light and dark theme support — writers work long, late sessions, so both
  need real design attention, not just an inverted palette
- Empty/error/loading state design pass
- Cross-platform webview rendering check if expanding beyond Windows
  (WebView2 vs. WebKit differences)

**Phase 9 — Distribution**
- GitHub Actions release workflow (below)
- Apply for free code signing via SignPath.io as a verified open-source
  project
- README finalization: pitch, screenshot/GIF, download badge, BYOK setup
  guide
- Versioning convention: semver tags (`v0.1.0`, etc.)

## 4. CI/CD & Release Workflow

- **Trigger**: push of a tag matching `v*.*.*`
- **Build**: a `tauri-action`-based GitHub Actions job builds the installer
  (Windows first; macOS/Linux can be added as additional matrix targets
  later)
- **Release**: the workflow auto-creates/updates the GitHub Release for
  that tag and attaches the built installer(s) as assets — no manual
  building or uploading
- **Signing**: once SignPath access is granted, add a signing step to the
  workflow so released binaries don't trigger SmartScreen warnings
- **README**: the download link/badge points at "latest release" rather
  than a specific version, so it never needs manual updates after a new tag

## 5. Open Decisions

Raised during the brainstorm but not yet resolved — worth settling early
since they affect the AI partner's core behavior:

- **Story bible population**: should the writer fill it out manually
  (more control, more deliberate), or should the AI auto-extract/suggest
  entries as it notices new characters or world details (less friction,
  needs a review step so it doesn't drift wrong)?
- **Proactive vs. reactive partner**: should the AI only respond when
  asked, or ever proactively flag things while the user writes (e.g., a
  character's voice shifting)? This is the difference between a chat
  feature and a live writing companion, and it affects the UI, not just
  the prompting.

## 6. Distribution Checklist

- [ ] License chosen and added to the repo
- [ ] README complete: pitch, screenshot, download badge, BYOK setup guide
- [ ] GitHub Actions release workflow tested end-to-end on a real tag
- [ ] SignPath application submitted
- [ ] First tagged release (`v0.1.0`) published
