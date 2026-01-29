//! ERP/CRM 客户端 - Tauri 后端

pub mod commands;
pub mod database;
pub mod scanner;
pub mod storage;
pub mod sync;

use commands::*;
use database::Database;
use tauri::Manager;
use std::sync::Arc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            auth_login, auth_logout, auth_get_current_user,
            customer_list, customer_get, customer_create, customer_update, customer_delete,
            product_list, product_get, product_get_by_barcode, product_create, product_update, product_delete, product_low_stock,
            stock_in, stock_out, stock_adjust,
            order_list, order_get, order_create, order_update, order_delete, order_confirm, order_cancel, order_complete,
            sync_status, sync_start, sync_stop, sync_force_full,
            scanner_list_ports, scanner_connect, scanner_disconnect, scanner_status, scanner_handle_scan,
            storage_set_secure, storage_get_secure, storage_delete_secure, storage_clear_secure,
            report_dashboard_stats, report_sales, report_inventory,
            system_info, system_check_update, system_clear_cache,
        ])
        .setup(|app| {
            let data_dir = app.path().app_data_dir().expect("获取数据目录失败");
            std::fs::create_dir_all(&data_dir).ok();

            let db_path = data_dir.join("erp_crm.db");
            let db = Database::new(db_path).expect("数据库初始化失败");
            app.manage(DbState(Arc::new(db)));

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("启动应用失败");
}
