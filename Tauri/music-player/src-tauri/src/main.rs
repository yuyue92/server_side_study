#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;
mod scanner;
mod commands;

use database::init_database;

fn main() {
    let db = init_database().expect("Failed to initialize database");
    
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(db)
        .invoke_handler(tauri::generate_handler![
            commands::select_music_folder,
            commands::scan_music_folder,
            commands::get_library,
            commands::search_tracks,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}