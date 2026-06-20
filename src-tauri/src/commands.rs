//! Tauri commands exposed to the frontend.
//!
//! Each `#[tauri::command]` here is callable from the React layer via
//! `invoke("name", args)`. File IO lives in [`crate::fs`] and PDF export in
//! [`crate::pdf`]; this module is the thin command surface that wires them up.

/// Returns the application version from the compiled crate metadata.
/// Used by the About/settings surface and the title bar build stamp.
#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

/// Returns the path of a `.muxw` file the app was launched with, if any.
///
/// When a `.muxw` file is double clicked, the OS launches the executable with
/// the file path as an argument; the frontend calls this on startup to open
/// that document.
#[tauri::command]
pub fn get_launch_path() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|arg| arg.to_lowercase().ends_with(".muxw"))
}
