# Muxwriter — Feature Specification

A desktop screenwriting application pairing a strict industry-format script
editor with an AI brainstorming partner. Open source, distributed entirely
through GitHub.

## 1. Concept

Like Celtx, but with a built-in conversational partner the writer can talk
through plot, character, and structure with — not just a formatting tool.

## 2. Core Editor

- Industry-standard screenplay formatting (scene headings, action,
  character, dialogue, parenthetical, transition)
- Built on the **Fountain** markup standard rather than a custom format —
  use a parser library (e.g. `fountain-js`) to convert plain text into
  structured elements, which formatting, export, and insights all read from
- Left icon rail for switching/inserting element types
- Script page styled to feel like a real document: Courier Prime
  monospace, correct margins — formatting fidelity is non-negotiable here

## 3. AI Brainstorming Partner

- Text chat sidebar, styled consistently with the editor (not a bolted-on
  generic chat widget)
- Voice input: mic icon in the composer using speech-to-text to transcribe
  into the text box (voice in only — replies stay text)
- Partner is context-aware of the actual script, not generic advice

### Context architecture (cost control + quality)
- **Story bible**: persistent, full-detail file — characters, world rules,
  tone/voice, themes, central relationships. Stays small regardless of
  script length, always included in context (CLAUDE.md-style).
- **Rolling scene/page summary log**: compressed running summary of
  completed scenes, grows slowly, keeps cost flat as the script grows
- **Current scene/page**: always included in full detail
- **On-demand scene fetch**: past scenes are *not* preloaded by default

### Agentic tool-calling
- The model has callable tools (e.g. `search_script(query)`,
  `get_scene(scene_id)`) it invokes itself when a reference points outside
  current context (mirrors how Claude's own past-conversation search works)
- This is the cost-minimizing pattern: cost scales with what's relevant per
  turn, not total script length

## 4. AI Editing Capabilities

- AI can modify the script directly when asked, via a `propose_edit
  (scene_id, change)`-style tool call
- **Never silent auto-apply** — changes render as an in-editor diff overlay
  (old text struck through, new text highlighted in the brand accent
  color) requiring explicit user accept/reject, preserving the writer's
  voice and trust

## 5. Selection & Citation Features

- **Highlight-to-ask**: selecting text and invoking the AI auto-bundles
  that selection plus its scene/page location and present characters as
  context for that turn
- **`@` mentions**: typing `@Scene 14` or `@Maya` in the composer
  autocompletes and explicitly pulls that scene/character into context
  (Cursor-style)
- **Clickable AI citations**: when the AI references something in its
  reply, it cites the specific scene/page, rendered as a link that jumps
  the editor to that location — falls out naturally from tool-call results
  already carrying scene IDs
- Underlying principle: scenes are treated as stable, addressable units
  everywhere (search, citation, editing, insights all read from the same
  structure)

## 6. Insights / Reports

- Character breakdown: line counts, scene appearances
- Scene breakdown: INT/EXT, day/night, locations
- Derived for free from the same structured data the Fountain parser
  already produces for formatting — no separate extraction system
- AI partner can also answer insight questions conversationally
  ("how has Maya's screen time changed across acts?")

## 7. Notes

- Notes attachable to a specific scene or character
- A freeform global story-notes space
- Not derivable from script text, so stored as data — lives in the
  `.muxw` file's metadata block alongside the story bible

## 8. Export

- **PDF export** of the script — correct screenplay margins/spacing,
  12pt Courier; reference existing open-source Fountain-to-PDF tools
  (Afterwriting, screenplain) for layout logic rather than building from
  scratch
- **Chat export** — AI brainstorming transcript, styled consistently with
  the app's branding (Markdown or PDF)

## 9. File Format

- Custom extension: **`.muxw`**
- Plain-text based (not binary): Fountain-syntax script content with a
  front-matter metadata block (story bible, scene log, notes) — keeps
  files human-readable and git-diffable, fitting the open-source nature
  of the project
- Save/Open dialogs filtered to `.muxw`
- OS-level file association registered via `tauri.conf.json` bundler
  config so double-clicking a `.muxw` file launches Muxwriter, with a
  custom file-type icon in File Explorer

## 10. Platform & Architecture

- **Desktop app built with Tauri** (chosen over Electron: smaller
  binaries, lower memory, faster startup, security-first design, and
  aligns with existing Rust experience)
- Windows-first executable (`.exe`); cross-platform build possible later
- **No backend server** — scripts are local files on the user's machine;
  AI calls go directly from the app to the LLM provider
- **BYOK (Bring Your Own Key)**: user supplies their own
  Anthropic/OpenAI API key, stored locally, never touching a server —
  removes hosting cost and billing complexity entirely
- Tool-calling/agent architecture is independent of the billing model

## 11. Distribution

- Fully open source, entire project lives in a single **GitHub repo**
- Executables distributed via **GitHub Releases** (free)
- **GitHub Actions** workflow (e.g. `tauri-action`) builds and attaches
  binaries to the release automatically on tag push
- README includes: short pitch, screenshot/GIF of editor + AI sidebar,
  download badge/link, BYOK setup instructions
- Unsigned Windows `.exe` triggers SmartScreen warnings — apply for free
  code signing via **SignPath.io** for verified open-source projects
  rather than paying for a commercial cert

## 12. Visual Identity

- **Chrome**: warm graphite/ink dark background (not pure black, not a
  generic neon-accent dark mode)
- **Script page**: warm cream paper background, Courier Prime
- **Accent**: muted brass/amber, used sparingly (active states, the
  signature element)
- **Typography**: Fraunces (serif) for brand/display moments, Inter
  (grotesk) for UI chrome and labels, Courier Prime reserved strictly for
  script content
- **Signature element**: live page-count-to-runtime indicator (~1 page ≈
  1 minute of screen time) in the top toolbar
- **Custom frameless title bar**: brand mark + "Muxwriter" (left), open
  file name centered, minimal window controls (minimize/maximize/close)
  on the right, neutral until hover (close gets a subtle red), rounded
  window corners
- Overall feel: premium and exact, restraint everywhere except the one
  brass accent — should read as built by people who understand
  screenplay format deeply, not a generic AI-generated SaaS dashboard
