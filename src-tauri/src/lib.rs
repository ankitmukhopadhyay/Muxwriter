mod commands;
mod fs;
mod pdf;
mod settings;
mod store;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::app_version,
            commands::get_launch_path,
            fs::read_text_file,
            fs::write_text_file,
            fs::write_binary_file,
            fs::read_binary_file,
            settings::read_settings,
            settings::write_settings,
            store::read_app_file,
            store::write_app_file,
            store::delete_app_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
