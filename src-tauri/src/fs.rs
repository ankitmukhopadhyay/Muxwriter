//! Local file read/write for screenplay documents.
//!
//! Muxwriter documents are plain text on disk: Fountain syntax in Phase 1,
//! later wrapped with a `.muxw` front matter metadata block. All persistence
//! is local; there is no backend server. The dialog plugin picks the path on
//! the frontend, then these commands do the actual read and write with the
//! standard library so no broad filesystem scope has to be granted.

use std::fs;

/// Reads a UTF-8 text file and returns its contents.
#[tauri::command]
pub fn read_text_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Writes UTF-8 text to a file, creating or truncating it.
#[tauri::command]
pub fn write_text_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Writes raw bytes to a file. Used for binary exports such as PDF.
#[tauri::command]
pub fn write_binary_file(path: String, bytes: Vec<u8>) -> Result<(), String> {
    fs::write(&path, bytes).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn write_then_read_round_trips() {
        let mut path = std::env::temp_dir();
        path.push(format!("muxw_test_{}.fountain", std::process::id()));
        let path = path.to_string_lossy().to_string();
        let body = "INT. KITCHEN - NIGHT\n\nMaya pours coffee.\n";

        write_text_file(path.clone(), body.to_string()).expect("write");
        let read = read_text_file(path.clone()).expect("read");
        assert_eq!(read, body);

        fs::remove_file(&path).ok();
    }

    #[test]
    fn reading_a_missing_file_is_an_error() {
        let result = read_text_file("does_not_exist_muxw.fountain".to_string());
        assert!(result.is_err());
    }
}
