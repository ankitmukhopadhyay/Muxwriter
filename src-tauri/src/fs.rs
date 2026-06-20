//! Local file read/write for screenplay documents.
//!
//! Muxwriter documents are plain text on disk: Fountain syntax, later wrapped
//! with a `.muxw` front matter metadata block (Phase 2). All persistence is
//! local; there is no backend server. Concrete read/write commands land in
//! Phase 1 once the editor produces saveable content.
