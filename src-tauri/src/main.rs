#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai_commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_oauth::init())
        .plugin(tauri_plugin_stronghold::Builder::new(|password| password.as_bytes().to_vec()).build())
        .invoke_handler(tauri::generate_handler![
            ai_commands::ai_save_credentials,
            ai_commands::ai_get_credentials_status,
            ai_commands::ai_validate_credentials,
            ai_commands::ai_list_models,
            ai_commands::ai_append_diagnostic_log,
            ai_commands::ai_read_diagnostic_log,
            ai_commands::ai_invoke_provider,
            ai_commands::ai_clear_credentials
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
