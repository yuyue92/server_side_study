pub mod commands;
pub mod utils;

use commands::{
    export_as_json, export_as_postman, generate_curl,
    http::{send_http_request, test_connection},
    storage::{delete_data, list_data_files, load_data, save_data},
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            // HTTP 命令
            send_http_request,
            test_connection,
            // 存储命令
            save_data,
            load_data,
            delete_data,
            list_data_files,
            // 导出命令
            generate_curl,
            export_as_json,
            export_as_postman,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
