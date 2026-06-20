# Contributing to Muxwriter

Thanks for your interest in Muxwriter. It is an open source desktop
screenwriting app built with Tauri and React, and contributions are welcome.

## Prerequisites

- **Node.js** 20 or newer (LTS recommended)
- **Rust** stable toolchain (install via [rustup](https://rustup.rs))
- Platform build dependencies for Tauri 2, see the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/). On
  Windows this means the Microsoft C++ Build Tools and the WebView2 runtime.

## Getting started

```bash
npm install
npm run tauri dev
```

`npm run tauri dev` launches the desktop app with hot reload. To run only the
web frontend in a browser (without the Rust shell) use `npm run dev`.

## Project layout

The repository structure and the rationale behind each directory is documented
in `docs/muxwriter-build-plan.md`. The short version:

- `src/` — React frontend (components, lib, styles)
- `src-tauri/` — Rust backend (file IO, PDF export, Tauri commands)
- `docs/` — the feature spec and build plan

## Before you open a pull request

- `npm run lint` — type checks the frontend
- `npm run build` — verifies the frontend builds
- `cargo build` (inside `src-tauri/`) — verifies the Rust side compiles

CI runs these on every pull request.

## Commit style

Keep commit subjects short and in the imperative mood. Group related changes
into focused commits rather than one large catch all.

## Design principles

Muxwriter aims to feel like it was built by people who understand screenplay
format deeply. Formatting fidelity is non negotiable, the visual language is
restrained (one brass accent, warm graphite chrome, cream script page), and
the AI partner never silently changes the writer's work. Keep these in mind
when proposing changes to the editor or the AI features.
