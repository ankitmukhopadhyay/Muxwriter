//! Local application settings (BYOK API key, provider, model).
//!
//! Settings live in a single JSON file in the OS app config directory. The
//! API key is stored locally and never sent anywhere except the user's chosen
//! LLM provider. The frontend owns the schema; these commands just read and
//! write the raw JSON so the schema can evolve without touching Rust.

use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

/// Returns the raw settings JSON, or an empty object if none has been saved.
#[tauri::command]
pub fn read_settings(app: tauri::AppHandle) -> Result<String, String> {
    let path = settings_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(contents) => Ok(contents),
        Err(_) => Ok("{}".to_string()),
    }
}

/// Persists the raw settings JSON to the app config directory.
#[tauri::command]
pub fn write_settings(app: tauri::AppHandle, contents: String) -> Result<(), String> {
    let path = settings_path(&app)?;
    fs::write(&path, contents).map_err(|e| e.to_string())
}
