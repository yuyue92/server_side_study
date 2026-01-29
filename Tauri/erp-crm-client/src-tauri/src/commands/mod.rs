//! Tauri 命令 - 前端可调用的后端接口

#![allow(unused_variables)]

use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, Emitter, State};
use crate::database::{Database, Customer, Product, Order};
use chrono::Utc;
use std::sync::Arc;

pub struct DbState(pub Arc<Database>);

#[derive(Debug, Serialize)]
pub struct CommandError(String);
impl From<String> for CommandError { fn from(s: String) -> Self { CommandError(s) } }
impl From<&str> for CommandError { fn from(s: &str) -> Self { CommandError(s.to_string()) } }
type CmdResult<T> = Result<T, CommandError>;

#[derive(Debug, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
    pub message: Option<String>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self { Self { success: true, data: Some(data), error: None, message: None } }
    pub fn error(error: &str) -> Self { Self { success: false, data: None, error: Some(error.to_string()), message: None } }
}

#[tauri::command]
pub async fn auth_login(username: String, password: String) -> ApiResponse<serde_json::Value> {
    if username == "admin" && password == "admin123" {
        ApiResponse::success(json!({"id": "user-1", "username": "admin", "name": "管理员", "email": "admin@example.com", "role": "admin"}))
    } else { ApiResponse::error("用户名或密码错误") }
}

#[tauri::command]
pub async fn auth_logout() -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn auth_get_current_user() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({"id": "user-1", "username": "admin", "name": "管理员", "email": "admin@example.com", "role": "admin"}))
}

#[tauri::command]
pub async fn customer_list(db: State<'_, DbState>) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.list_customers() {
        Ok(customers) => Ok(ApiResponse::success(json!({ "items": customers, "total": customers.len() }))),
        Err(e) => Ok(ApiResponse::error(&format!("获取客户列表失败: {}", e)))
    }
}

#[tauri::command]
pub async fn customer_get(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.get_customer(&id) {
        Ok(Some(c)) => Ok(ApiResponse::success(json!(c))),
        Ok(None) => Ok(ApiResponse::error("客户不存在")),
        Err(e) => Ok(ApiResponse::error(&format!("获取客户失败: {}", e)))
    }
}

#[tauri::command]
pub async fn customer_create(db: State<'_, DbState>, data: serde_json::Value) -> CmdResult<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    let customer = Customer {
        id: uuid::Uuid::new_v4().to_string(),
        name: data["name"].as_str().unwrap_or("").to_string(),
        company: data["company"].as_str().unwrap_or("").to_string(),
        email: data["email"].as_str().unwrap_or("").to_string(),
        phone: data["phone"].as_str().unwrap_or("").to_string(),
        address: data["address"].as_str().unwrap_or("").to_string(),
        category: data["category"].as_str().unwrap_or("regular").to_string(),
        status: data["status"].as_str().unwrap_or("active").to_string(),
        contact_person: data["contactPerson"].as_str().unwrap_or("").to_string(),
        credit_limit: data["creditLimit"].as_f64().unwrap_or(0.0),
        balance: data["balance"].as_f64().unwrap_or(0.0),
        remark: data["remark"].as_str().unwrap_or("").to_string(),
        source: data["source"].as_str().unwrap_or("").to_string(),
        created_at: now.clone(), updated_at: now,
    };
    match db.0.create_customer(&customer) {
        Ok(_) => Ok(ApiResponse::success(json!(customer))),
        Err(e) => Ok(ApiResponse::error(&format!("创建客户失败: {}", e)))
    }
}

#[tauri::command]
pub async fn customer_update(db: State<'_, DbState>, id: String, data: serde_json::Value) -> CmdResult<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    let customer = Customer {
        id: id.clone(),
        name: data["name"].as_str().unwrap_or("").to_string(),
        company: data["company"].as_str().unwrap_or("").to_string(),
        email: data["email"].as_str().unwrap_or("").to_string(),
        phone: data["phone"].as_str().unwrap_or("").to_string(),
        address: data["address"].as_str().unwrap_or("").to_string(),
        category: data["category"].as_str().unwrap_or("regular").to_string(),
        status: data["status"].as_str().unwrap_or("active").to_string(),
        contact_person: data["contactPerson"].as_str().unwrap_or("").to_string(),
        credit_limit: data["creditLimit"].as_f64().unwrap_or(0.0),
        balance: data["balance"].as_f64().unwrap_or(0.0),
        remark: data["remark"].as_str().unwrap_or("").to_string(),
        source: data["source"].as_str().unwrap_or("").to_string(),
        created_at: data["createdAt"].as_str().unwrap_or(&now).to_string(), updated_at: now,
    };
    match db.0.update_customer(&customer) {
        Ok(_) => Ok(ApiResponse::success(json!(customer))),
        Err(e) => Ok(ApiResponse::error(&format!("更新客户失败: {}", e)))
    }
}

#[tauri::command]
pub async fn customer_delete(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<()>> {
    match db.0.delete_customer(&id) {
        Ok(_) => Ok(ApiResponse::success(())),
        Err(e) => Ok(ApiResponse::error(&format!("删除客户失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_list(db: State<'_, DbState>) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.list_products() {
        Ok(products) => Ok(ApiResponse::success(json!({ "items": products, "total": products.len() }))),
        Err(e) => Ok(ApiResponse::error(&format!("获取产品列表失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_get(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.get_product(&id) {
        Ok(Some(p)) => Ok(ApiResponse::success(json!(p))),
        Ok(None) => Ok(ApiResponse::error("产品不存在")),
        Err(e) => Ok(ApiResponse::error(&format!("获取产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_get_by_barcode(db: State<'_, DbState>, barcode: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.get_product_by_barcode(&barcode) {
        Ok(Some(p)) => Ok(ApiResponse::success(json!(p))),
        Ok(None) => Ok(ApiResponse::error("产品不存在")),
        Err(e) => Ok(ApiResponse::error(&format!("获取产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_create(db: State<'_, DbState>, data: serde_json::Value) -> CmdResult<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let product = Product {
        id: id.clone(),
        code: data["code"].as_str().map(|s| s.to_string()).unwrap_or_else(|| format!("P{}", &id[..8])),
        barcode: data["barcode"].as_str().unwrap_or("").to_string(),
        name: data["name"].as_str().unwrap_or("").to_string(),
        category: data["category"].as_str().unwrap_or("").to_string(),
        unit: data["unit"].as_str().unwrap_or("个").to_string(),
        specification: data["specification"].as_str().unwrap_or("").to_string(),
        brand: data["brand"].as_str().unwrap_or("").to_string(),
        cost_price: data["costPrice"].as_f64().unwrap_or(0.0),
        sell_price: data["sellPrice"].as_f64().unwrap_or(0.0),
        min_stock: data["minStock"].as_i64().unwrap_or(10) as i32,
        max_stock: data["maxStock"].as_i64().unwrap_or(1000) as i32,
        current_stock: data["currentStock"].as_i64().unwrap_or(0) as i32,
        warehouse_id: data["warehouseId"].as_str().unwrap_or("").to_string(),
        location: data["location"].as_str().unwrap_or("").to_string(),
        status: data["status"].as_str().unwrap_or("active").to_string(),
        description: data["description"].as_str().unwrap_or("").to_string(),
        created_at: now.clone(), updated_at: now,
    };
    match db.0.create_product(&product) {
        Ok(_) => Ok(ApiResponse::success(json!(product))),
        Err(e) => Ok(ApiResponse::error(&format!("创建产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_update(db: State<'_, DbState>, id: String, data: serde_json::Value) -> CmdResult<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    let product = Product {
        id: id.clone(),
        code: data["code"].as_str().unwrap_or("").to_string(),
        barcode: data["barcode"].as_str().unwrap_or("").to_string(),
        name: data["name"].as_str().unwrap_or("").to_string(),
        category: data["category"].as_str().unwrap_or("").to_string(),
        unit: data["unit"].as_str().unwrap_or("个").to_string(),
        specification: data["specification"].as_str().unwrap_or("").to_string(),
        brand: data["brand"].as_str().unwrap_or("").to_string(),
        cost_price: data["costPrice"].as_f64().unwrap_or(0.0),
        sell_price: data["sellPrice"].as_f64().unwrap_or(0.0),
        min_stock: data["minStock"].as_i64().unwrap_or(10) as i32,
        max_stock: data["maxStock"].as_i64().unwrap_or(1000) as i32,
        current_stock: data["currentStock"].as_i64().unwrap_or(0) as i32,
        warehouse_id: data["warehouseId"].as_str().unwrap_or("").to_string(),
        location: data["location"].as_str().unwrap_or("").to_string(),
        status: data["status"].as_str().unwrap_or("active").to_string(),
        description: data["description"].as_str().unwrap_or("").to_string(),
        created_at: data["createdAt"].as_str().unwrap_or(&now).to_string(), updated_at: now,
    };
    match db.0.update_product(&product) {
        Ok(_) => Ok(ApiResponse::success(json!(product))),
        Err(e) => Ok(ApiResponse::error(&format!("更新产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_delete(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<()>> {
    match db.0.delete_product(&id) {
        Ok(_) => Ok(ApiResponse::success(())),
        Err(e) => Ok(ApiResponse::error(&format!("删除产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn product_low_stock(db: State<'_, DbState>) -> CmdResult<ApiResponse<Vec<serde_json::Value>>> {
    match db.0.list_low_stock_products() {
        Ok(products) => Ok(ApiResponse::success(products.into_iter().map(|p| json!(p)).collect())),
        Err(e) => Ok(ApiResponse::error(&format!("获取低库存产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn stock_in(db: State<'_, DbState>, product_id: String, quantity: i32, unit_price: f64, remark: Option<String>) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.update_stock(&product_id, quantity, "in", unit_price, remark.as_deref().unwrap_or("")) {
        Ok(_) => Ok(ApiResponse::success(json!({ "productId": product_id, "type": "in", "quantity": quantity }))),
        Err(e) => Ok(ApiResponse::error(&format!("入库失败: {}", e)))
    }
}

#[tauri::command]
pub async fn stock_out(db: State<'_, DbState>, product_id: String, quantity: i32, unit_price: f64, remark: Option<String>) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.update_stock(&product_id, -quantity, "out", unit_price, remark.as_deref().unwrap_or("")) {
        Ok(_) => Ok(ApiResponse::success(json!({ "productId": product_id, "type": "out", "quantity": quantity }))),
        Err(e) => Ok(ApiResponse::error(&format!("出库失败: {}", e)))
    }
}

#[tauri::command]
pub async fn stock_adjust(db: State<'_, DbState>, product_id: String, actual_quantity: i32, remark: Option<String>) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.get_product(&product_id) {
        Ok(Some(p)) => {
            let diff = actual_quantity - p.current_stock;
            match db.0.update_stock(&product_id, diff, "adjust", 0.0, remark.as_deref().unwrap_or("")) {
                Ok(_) => Ok(ApiResponse::success(json!({ "productId": product_id, "type": "adjust", "actualQuantity": actual_quantity }))),
                Err(e) => Ok(ApiResponse::error(&format!("调整库存失败: {}", e)))
            }
        }
        Ok(None) => Ok(ApiResponse::error("产品不存在")),
        Err(e) => Ok(ApiResponse::error(&format!("获取产品失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_list(db: State<'_, DbState>) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.list_orders() {
        Ok(orders) => Ok(ApiResponse::success(json!({ "items": orders, "total": orders.len() }))),
        Err(e) => Ok(ApiResponse::error(&format!("获取订单列表失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_get(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.get_order(&id) {
        Ok(Some(order)) => {
            let items = db.0.get_order_items(&id).unwrap_or_default();
            Ok(ApiResponse::success(json!({ "order": order, "items": items })))
        }
        Ok(None) => Ok(ApiResponse::error("订单不存在")),
        Err(e) => Ok(ApiResponse::error(&format!("获取订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_create(db: State<'_, DbState>, data: serde_json::Value) -> CmdResult<ApiResponse<serde_json::Value>> {
    let now = Utc::now().to_rfc3339();
    let id = uuid::Uuid::new_v4().to_string();
    let order_type = data["type"].as_str().unwrap_or("sale");
    let code = db.0.generate_order_code(order_type);
    let order = Order {
        id: id.clone(), code: code.clone(), order_type: order_type.to_string(),
        customer_id: data["customerId"].as_str().unwrap_or("").to_string(),
        customer_name: data["customerName"].as_str().unwrap_or("").to_string(),
        status: "draft".to_string(),
        total_quantity: data["totalQuantity"].as_i64().unwrap_or(0) as i32,
        total_amount: data["totalAmount"].as_f64().unwrap_or(0.0),
        discount_amount: data["discountAmount"].as_f64().unwrap_or(0.0),
        payable_amount: data["payableAmount"].as_f64().unwrap_or(0.0),
        paid_amount: data["paidAmount"].as_f64().unwrap_or(0.0),
        delivery_address: data["deliveryAddress"].as_str().unwrap_or("").to_string(),
        delivery_date: data["deliveryDate"].as_str().unwrap_or("").to_string(),
        remark: data["remark"].as_str().unwrap_or("").to_string(),
        operator_id: "user-1".to_string(), operator_name: "管理员".to_string(),
        created_at: now.clone(), updated_at: now,
    };
    match db.0.create_order(&order) {
        Ok(_) => Ok(ApiResponse::success(json!(order))),
        Err(e) => Ok(ApiResponse::error(&format!("创建订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_update(db: State<'_, DbState>, id: String, data: serde_json::Value) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.get_order(&id) {
        Ok(Some(mut order)) => {
            order.customer_id = data["customerId"].as_str().unwrap_or(&order.customer_id).to_string();
            order.customer_name = data["customerName"].as_str().unwrap_or(&order.customer_name).to_string();
            order.total_quantity = data["totalQuantity"].as_i64().unwrap_or(order.total_quantity as i64) as i32;
            order.total_amount = data["totalAmount"].as_f64().unwrap_or(order.total_amount);
            order.discount_amount = data["discountAmount"].as_f64().unwrap_or(order.discount_amount);
            order.payable_amount = data["payableAmount"].as_f64().unwrap_or(order.payable_amount);
            order.remark = data["remark"].as_str().unwrap_or(&order.remark).to_string();
            order.updated_at = Utc::now().to_rfc3339();
            match db.0.update_order(&order) {
                Ok(_) => Ok(ApiResponse::success(json!(order))),
                Err(e) => Ok(ApiResponse::error(&format!("更新订单失败: {}", e)))
            }
        }
        Ok(None) => Ok(ApiResponse::error("订单不存在")),
        Err(e) => Ok(ApiResponse::error(&format!("获取订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_delete(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<()>> {
    match db.0.delete_order(&id) {
        Ok(_) => Ok(ApiResponse::success(())),
        Err(e) => Ok(ApiResponse::error(&format!("删除订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_confirm(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.update_order_status(&id, "confirmed") {
        Ok(_) => Ok(ApiResponse::success(json!({ "id": id, "status": "confirmed" }))),
        Err(e) => Ok(ApiResponse::error(&format!("确认订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_cancel(db: State<'_, DbState>, id: String, reason: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.update_order_status(&id, "cancelled") {
        Ok(_) => Ok(ApiResponse::success(json!({ "id": id, "status": "cancelled", "cancelReason": reason }))),
        Err(e) => Ok(ApiResponse::error(&format!("取消订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn order_complete(db: State<'_, DbState>, id: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    match db.0.update_order_status(&id, "completed") {
        Ok(_) => Ok(ApiResponse::success(json!({ "id": id, "status": "completed" }))),
        Err(e) => Ok(ApiResponse::error(&format!("完成订单失败: {}", e)))
    }
}

#[tauri::command]
pub async fn sync_status() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({ "isSyncing": false, "lastSyncAt": null, "pendingChanges": 0, "syncErrors": [] }))
}

#[tauri::command]
pub async fn sync_start(app: AppHandle) -> ApiResponse<()> {
    app.emit("sync:progress", json!({"progress": 0, "message": "开始同步..."})).ok();
    tokio::spawn(async move {
        tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
        app.emit("sync:complete", ()).ok();
    });
    ApiResponse::success(())
}

#[tauri::command]
pub async fn sync_stop() -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn sync_force_full() -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn scanner_list_ports() -> ApiResponse<Vec<String>> {
    match serialport::available_ports() {
        Ok(ports) => ApiResponse::success(ports.into_iter().map(|p| p.port_name).collect()),
        Err(e) => ApiResponse::error(&format!("获取串口列表失败: {}", e)),
    }
}

#[tauri::command]
pub async fn scanner_connect(config: serde_json::Value) -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn scanner_disconnect() -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn scanner_status() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({ "connected": false, "port": null }))
}

#[tauri::command]
pub async fn scanner_handle_scan(db: State<'_, DbState>, barcode: String) -> CmdResult<ApiResponse<serde_json::Value>> {
    let product = db.0.get_product_by_barcode(&barcode).ok().flatten();
    Ok(ApiResponse::success(json!({ "barcode": barcode, "timestamp": Utc::now().to_rfc3339(), "product": product })))
}

#[tauri::command]
pub async fn storage_set_secure(key: String, value: String) -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn storage_get_secure(key: String) -> ApiResponse<Option<String>> { ApiResponse::success(None) }

#[tauri::command]
pub async fn storage_delete_secure(key: String) -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn storage_clear_secure() -> ApiResponse<()> { ApiResponse::success(()) }

#[tauri::command]
pub async fn report_dashboard_stats(db: State<'_, DbState>) -> CmdResult<ApiResponse<serde_json::Value>> {
    let total_customers = db.0.count_customers().unwrap_or(0);
    let total_products = db.0.count_products().unwrap_or(0);
    let low_stock = db.0.count_low_stock_products().unwrap_or(0);
    let today_orders = db.0.count_today_orders().unwrap_or(0);
    let today_revenue = db.0.get_today_revenue().unwrap_or(0.0);
    Ok(ApiResponse::success(json!({
        "totalCustomers": total_customers, "activeCustomers": total_customers,
        "totalProducts": total_products, "lowStockProducts": low_stock,
        "todayOrders": today_orders, "todayRevenue": today_revenue,
        "monthlyRevenue": today_revenue * 30.0, "monthlyGrowth": 12.5
    })))
}

#[tauri::command]
pub async fn report_sales(start_date: String, end_date: String) -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({ "period": format!("{} - {}", start_date, end_date), "totalOrders": 0, "totalAmount": 0 }))
}

#[tauri::command]
pub async fn report_inventory(db: State<'_, DbState>) -> CmdResult<ApiResponse<serde_json::Value>> {
    let total = db.0.count_products().unwrap_or(0);
    let low = db.0.count_low_stock_products().unwrap_or(0);
    Ok(ApiResponse::success(json!({ "totalProducts": total, "totalValue": 0, "lowStockProducts": low })))
}

#[tauri::command]
pub async fn system_info() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({ "version": "1.0.0", "os": std::env::consts::OS, "arch": std::env::consts::ARCH }))
}

#[tauri::command]
pub async fn system_check_update() -> ApiResponse<serde_json::Value> {
    ApiResponse::success(json!({ "hasUpdate": false, "version": null, "releaseNotes": null }))
}

#[tauri::command]
pub async fn system_clear_cache() -> ApiResponse<()> { ApiResponse::success(()) }