# Muxwriter

**A desktop screenwriting app with an AI brainstorming partner who actually
knows your story.**

Muxwriter pairs a strict, industry format script editor with a conversational
AI partner you can talk through plot, character, and structure with. Like
Celtx, but with a writing companion built in rather than a formatting tool
alone. Free, open source, and distributed entirely through GitHub.

> Status: early development. Built in public, phase by phase. See
> `docs/muxwriter-build-plan.md` for the roadmap.

## Highlights

- **Industry standard formatting** built on the [Fountain](https://fountain.io)
  markup standard, rendered on a cream script page in Courier Prime.
- **AI brainstorming partner** that is context aware of your actual script,
  not generic advice. It can pull in past scenes on its own and suggest edits
  you explicitly accept or reject, never silently.
- **Local first and BYOK.** Your scripts are plain text files on your machine.
  AI calls go directly from the app to your chosen provider using your own API
  key, stored locally. There is no backend server.
- **Built with Tauri** for a small, fast, secure native app.

## Bring Your Own Key (BYOK)

Muxwriter does not host or proxy any AI. You supply your own Anthropic or
OpenAI API key in Settings, where it is stored locally and never sent to any
server other than the provider you chose. This keeps the app free to run and
your data on your machine. Detailed setup instructions land alongside the AI
partner in Phase 3.

## Building from source

Prerequisites: Node.js 20+, the Rust stable toolchain, and the Tauri platform
build dependencies (see
[Tauri prerequisites](https://tauri.app/start/prerequisites/)).

```bash
npm install
npm run tauri dev      # run the desktop app with hot reload
npm run tauri build    # produce a release installer
```

See `CONTRIBUTING.md` for the full development guide.

## License

[MIT](LICENSE)
