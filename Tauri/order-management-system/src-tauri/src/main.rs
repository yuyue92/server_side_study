// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{Manager, State};

// 数据结构定义
#[derive(Debug, Serialize, Deserialize)]
struct Order {
    id: Option<i64>,
    order_number: String,
    customer_id: i64,
    product_id: i64,
    quantity: i32,
    total_amount: f64,
    status: String,
    order_date: String,
    notes: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Customer {
    id: Option<i64>,
    name: String,
    email: String,
    phone: String,
    address: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct Product {
    id: Option<i64>,
    name: String,
    description: String,
    price: f64,
    stock: i32,
}

#[derive(Debug, Serialize)]
struct OrderDetail {
    id: i64,
    order_number: String,
    customer_name: String,
    product_name: String,
    quantity: i32,
    total_amount: f64,
    status: String,
    order_date: String,
    notes: String,
}

#[derive(Debug, Serialize)]
struct Statistics {
    total_orders: i64,
    total_customers: i64,
    total_products: i64,
    total_revenue: f64,
}

// 数据库状态管理
struct DbState(Mutex<Connection>);

// 初始化数据库
fn init_database(conn: &Connection) -> Result<()> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS customers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            phone TEXT NOT NULL,
            address TEXT NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            price REAL NOT NULL,
            stock INTEGER NOT NULL
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_number TEXT NOT NULL UNIQUE,
            customer_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            total_amount REAL NOT NULL,
            status TEXT NOT NULL,
            order_date TEXT NOT NULL,
            notes TEXT,
            FOREIGN KEY (customer_id) REFERENCES customers(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )",
        [],
    )?;

    Ok(())
}

// Tauri 命令

// 订单相关
#[tauri::command]
fn create_order(state: State<DbState>, order: Order) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute(
        "INSERT INTO orders (order_number, customer_id, product_id, quantity, total_amount, status, order_date, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![
            order.order_number,
            order.customer_id,
            order.product_id,
            order.quantity,
            order.total_amount,
            order.status,
            order.order_date,
            order.notes,
        ],
    )
    .map_err(|e| format!("创建订单失败: {}", e))?;

    Ok("订单创建成功".to_string())
}

#[tauri::command]
fn get_orders(state: State<DbState>) -> Result<Vec<OrderDetail>, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    let mut stmt = conn
        .prepare(
            "SELECT o.id, o.order_number, c.name, p.name, o.quantity, o.total_amount, o.status, o.order_date, o.notes
             FROM orders o
             JOIN customers c ON o.customer_id = c.id
             JOIN products p ON o.product_id = p.id
             ORDER BY o.order_date DESC",
        )
        .map_err(|e| format!("准备查询失败: {}", e))?;

    let orders = stmt
        .query_map([], |row| {
            Ok(OrderDetail {
                id: row.get(0)?,
                order_number: row.get(1)?,
                customer_name: row.get(2)?,
                product_name: row.get(3)?,
                quantity: row.get(4)?,
                total_amount: row.get(5)?,
                status: row.get(6)?,
                order_date: row.get(7)?,
                notes: row.get(8)?,
            })
        })
        .map_err(|e| format!("查询订单失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(orders)
}

#[tauri::command]
fn update_order_status(state: State<DbState>, id: i64, status: String) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute(
        "UPDATE orders SET status = ?1 WHERE id = ?2",
        params![status, id],
    )
    .map_err(|e| format!("更新订单状态失败: {}", e))?;
    
    Ok("订单状态更新成功".to_string())
}

#[tauri::command]
fn delete_order(state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute("DELETE FROM orders WHERE id = ?1", params![id])
        .map_err(|e| format!("删除订单失败: {}", e))?;
    
    Ok("订单删除成功".to_string())
}

// 客户相关
#[tauri::command]
fn create_customer(state: State<DbState>, customer: Customer) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute(
        "INSERT INTO customers (name, email, phone, address) VALUES (?1, ?2, ?3, ?4)",
        params![customer.name, customer.email, customer.phone, customer.address],
    )
    .map_err(|e| format!("创建客户失败: {}", e))?;
    
    Ok("客户创建成功".to_string())
}

#[tauri::command]
fn get_customers(state: State<DbState>) -> Result<Vec<Customer>, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, email, phone, address FROM customers")
        .map_err(|e| format!("准备查询失败: {}", e))?;

    let customers = stmt
        .query_map([], |row| {
            Ok(Customer {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                email: row.get(2)?,
                phone: row.get(3)?,
                address: row.get(4)?,
            })
        })
        .map_err(|e| format!("查询客户失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(customers)
}

#[tauri::command]
fn delete_customer(state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute("DELETE FROM customers WHERE id = ?1", params![id])
        .map_err(|e| format!("删除客户失败: {}", e))?;
    
    Ok("客户删除成功".to_string())
}

// 产品相关
#[tauri::command]
fn create_product(state: State<DbState>, product: Product) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute(
        "INSERT INTO products (name, description, price, stock) VALUES (?1, ?2, ?3, ?4)",
        params![product.name, product.description, product.price, product.stock],
    )
    .map_err(|e| format!("创建产品失败: {}", e))?;
    
    Ok("产品创建成功".to_string())
}

#[tauri::command]
fn get_products(state: State<DbState>) -> Result<Vec<Product>, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    let mut stmt = conn
        .prepare("SELECT id, name, description, price, stock FROM products")
        .map_err(|e| format!("准备查询失败: {}", e))?;

    let products = stmt
        .query_map([], |row| {
            Ok(Product {
                id: Some(row.get(0)?),
                name: row.get(1)?,
                description: row.get(2)?,
                price: row.get(3)?,
                stock: row.get(4)?,
            })
        })
        .map_err(|e| format!("查询产品失败: {}", e))?
        .filter_map(|r| r.ok())
        .collect();

    Ok(products)
}

#[tauri::command]
fn delete_product(state: State<DbState>, id: i64) -> Result<String, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    conn.execute("DELETE FROM products WHERE id = ?1", params![id])
        .map_err(|e| format!("删除产品失败: {}", e))?;
    
    Ok("产品删除成功".to_string())
}

// 统计信息
#[tauri::command]
fn get_statistics(state: State<DbState>) -> Result<Statistics, String> {
    let conn = state.0.lock().map_err(|e| format!("锁定数据库失败: {}", e))?;
    
    let total_orders: i64 = conn
        .query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
        .unwrap_or(0);
    
    let total_customers: i64 = conn
        .query_row("SELECT COUNT(*) FROM customers", [], |row| row.get(0))
        .unwrap_or(0);
    
    let total_products: i64 = conn
        .query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
        .unwrap_or(0);
    
    let total_revenue: f64 = conn
        .query_row("SELECT COALESCE(SUM(total_amount), 0) FROM orders", [], |row| row.get(0))
        .unwrap_or(0.0);

    Ok(Statistics {
        total_orders,
        total_customers,
        total_products,
        total_revenue,
    })
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            // 获取应用句柄
            let app_handle = app.handle();
            
            // 获取应用数据目录 (Tauri 2.x API)
            let app_data_dir = app_handle
                .path()
                .app_data_dir()
                .expect("无法获取应用数据目录");
            
            // 确保目录存在
            std::fs::create_dir_all(&app_data_dir).expect("无法创建应用数据目录");
            
            // 数据库文件路径
            let db_path = app_data_dir.join("orders.db");
            println!("数据库路径: {:?}", db_path);
            
            // 打开数据库连接
            let conn = Connection::open(&db_path).expect("无法创建数据库");
            
            // 初始化数据库
            if let Err(e) = init_database(&conn) {
                eprintln!("初始化数据库失败: {}", e);
                std::process::exit(1);
            }
            
            // 将数据库连接存入状态管理
            app_handle.manage(DbState(Mutex::new(conn)));
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_order,
            get_orders,
            update_order_status,
            delete_order,
            create_customer,
            get_customers,
            delete_customer,
            create_product,
            get_products,
            delete_product,
            get_statistics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}