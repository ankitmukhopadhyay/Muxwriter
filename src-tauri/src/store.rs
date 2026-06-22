//! Generic small file store in the app data directory.
//!
//! Used for app managed JSON such as saved chat sessions and the crash
//! recovery snapshot. The frontend owns the schema; these commands just read,
//! write, and delete a named file under the app data directory. The file name
//! is sanitized to a single path component so a name can never escape the
//! directory.

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

/// Reduces a requested name to a safe single path component (alphanumerics and
/// a few punctuation marks), so it can never traverse out of the data dir.
fn sanitize(name: &str) -> String {
    name.chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '.' || *c == '_' || *c == '-')
        .collect()
}

fn data_file(app: &tauri::AppHandle, name: &str) -> Result<PathBuf, String> {
    let safe = sanitize(name);
    if safe.is_empty() {
        return Err("invalid file name".to_string());
    }
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(safe))
}

/// Returns the contents of a named app data file, or an empty string if absent.
#[tauri::command]
pub fn read_app_file(app: tauri::AppHandle, name: String) -> Result<String, String> {
    let path = data_file(&app, &name)?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(contents),
        Err(_) => Ok(String::new()),
    }
}

/// Writes contents to a named app data file, creating or truncating it.
#[tauri::command]
pub fn write_app_file(app: tauri::AppHandle, name: String, contents: String) -> Result<(), String> {
    let path = data_file(&app, &name)?;
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Deletes a named app data file. A missing file is not an error.
#[tauri::command]
pub fn delete_app_file(app: tauri::AppHandle, name: String) -> Result<(), String> {
    let path = data_file(&app, &name)?;
    match fs::remove_file(&path) {
        Ok(()) => Ok(()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::sanitize;

    #[test]
    fn sanitize_strips_path_traversal() {
        assert_eq!(sanitize("../../etc/passwd"), "....etcpasswd");
        assert_eq!(sanitize("chats.json"), "chats.json");
        assert_eq!(sanitize("recovery_1.json"), "recovery_1.json");
    }
}
