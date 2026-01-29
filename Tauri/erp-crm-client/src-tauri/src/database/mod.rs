//! SQLite 数据库模块 - 离线数据缓存

#![allow(dead_code)]

use rusqlite::{Connection, Result as SqliteResult, params};
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use chrono::Utc;
use serde::{Deserialize, Serialize};

/// 数据库管理器
pub struct Database {
    pub conn: Arc<Mutex<Connection>>,
}

/// 客户数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Customer {
    pub id: String,
    pub name: String,
    pub company: String,
    pub email: String,
    pub phone: String,
    pub address: String,
    pub category: String,
    pub status: String,
    pub contact_person: String,
    pub credit_limit: f64,
    pub balance: f64,
    pub remark: String,
    pub source: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 产品数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub code: String,
    pub barcode: String,
    pub name: String,
    pub category: String,
    pub unit: String,
    pub specification: String,
    pub brand: String,
    pub cost_price: f64,
    pub sell_price: f64,
    pub min_stock: i32,
    pub max_stock: i32,
    pub current_stock: i32,
    pub warehouse_id: String,
    pub location: String,
    pub status: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 订单数据结构
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub id: String,
    pub code: String,
    pub order_type: String,
    pub customer_id: String,
    pub customer_name: String,
    pub status: String,
    pub total_quantity: i32,
    pub total_amount: f64,
    pub discount_amount: f64,
    pub payable_amount: f64,
    pub paid_amount: f64,
    pub delivery_address: String,
    pub delivery_date: String,
    pub remark: String,
    pub operator_id: String,
    pub operator_name: String,
    pub created_at: String,
    pub updated_at: String,
}

/// 订单明细
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub id: String,
    pub order_id: String,
    pub product_id: String,
    pub product_name: String,
    pub product_code: String,
    pub unit: String,
    pub quantity: i32,
    pub unit_price: f64,
    pub discount: f64,
    pub amount: f64,
    pub remark: String,
}

fn ensure_customers_source_column(conn: &Connection) -> SqliteResult<()> {
    // 检查 customers 是否已有 source 列
    let mut stmt = conn.prepare("PRAGMA table_info(customers)")?;
    let mut rows = stmt.query([])?;
    while let Some(row) = rows.next()? {
        let col_name: String = row.get(1)?; // 第2列是列名
        if col_name == "source" {
            return Ok(());
        }
    }
    // SQLite 不支持 ADD COLUMN IF NOT EXISTS，所以先检查再执行
    conn.execute(
        "ALTER TABLE customers ADD COLUMN source TEXT NOT NULL DEFAULT ''",
        [],
    )?;
    Ok(())
}

impl Database {
    /// 创建新的数据库连接
    pub fn new(db_path: PathBuf) -> SqliteResult<Self> {
        let conn = Connection::open(&db_path)?;
        let db = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        db.init_tables()?;
        Ok(db)
    }

    /// 初始化数据库表
    fn init_tables(&self) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        
        conn.execute(
            "CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                company TEXT DEFAULT '',
                email TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                address TEXT DEFAULT '',
                category TEXT DEFAULT 'regular',
                status TEXT DEFAULT 'active',
                contact_person TEXT DEFAULT '',
                credit_limit REAL DEFAULT 0,
                balance REAL DEFAULT 0,
                remark TEXT DEFAULT '',
                source TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        // 兼容旧库：旧 customers 表可能没有 source 列（IF NOT EXISTS 不会补列）
        ensure_customers_source_column(&conn)?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                barcode TEXT DEFAULT '',
                name TEXT NOT NULL,
                category TEXT DEFAULT '',
                unit TEXT DEFAULT '个',
                specification TEXT DEFAULT '',
                brand TEXT DEFAULT '',
                cost_price REAL DEFAULT 0,
                sell_price REAL DEFAULT 0,
                min_stock INTEGER DEFAULT 10,
                max_stock INTEGER DEFAULT 1000,
                current_stock INTEGER DEFAULT 0,
                warehouse_id TEXT DEFAULT '',
                location TEXT DEFAULT '',
                status TEXT DEFAULT 'active',
                description TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                order_type TEXT NOT NULL,
                customer_id TEXT DEFAULT '',
                customer_name TEXT DEFAULT '',
                status TEXT DEFAULT 'draft',
                total_quantity INTEGER DEFAULT 0,
                total_amount REAL DEFAULT 0,
                discount_amount REAL DEFAULT 0,
                payable_amount REAL DEFAULT 0,
                paid_amount REAL DEFAULT 0,
                delivery_address TEXT DEFAULT '',
                delivery_date TEXT DEFAULT '',
                remark TEXT DEFAULT '',
                operator_id TEXT DEFAULT '',
                operator_name TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS order_items (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                product_id TEXT DEFAULT '',
                product_name TEXT DEFAULT '',
                product_code TEXT DEFAULT '',
                unit TEXT DEFAULT '',
                quantity INTEGER DEFAULT 0,
                unit_price REAL DEFAULT 0,
                discount REAL DEFAULT 0,
                amount REAL DEFAULT 0,
                remark TEXT DEFAULT ''
            )",
            [],
        )?;

        conn.execute(
            "CREATE TABLE IF NOT EXISTS stock_records (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                record_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                before_quantity INTEGER DEFAULT 0,
                after_quantity INTEGER DEFAULT 0,
                unit_price REAL DEFAULT 0,
                total_amount REAL DEFAULT 0,
                remark TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )",
            [],
        )?;

        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_products_code ON products(code)", [])?;
        conn.execute("CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(code)", [])?;

        Ok(())
    }

    // ==================== 客户 CRUD ====================

    pub fn create_customer(&self, customer: &Customer) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO customers (id, name, company, email, phone, address, category, status, contact_person, credit_limit, balance, remark, source, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15)",
            params![
                customer.id, customer.name, customer.company, customer.email, customer.phone,
                customer.address, customer.category, customer.status, customer.contact_person,
                customer.credit_limit, customer.balance, customer.remark, customer.source,
                customer.created_at, customer.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn update_customer(&self, customer: &Customer) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE customers SET name=?2, company=?3, email=?4, phone=?5, address=?6, category=?7, status=?8, contact_person=?9, credit_limit=?10, balance=?11, remark=?12, source=?13, updated_at=?14 WHERE id=?1",
            params![
                customer.id, customer.name, customer.company, customer.email, customer.phone,
                customer.address, customer.category, customer.status, customer.contact_person,
                customer.credit_limit, customer.balance, customer.remark, customer.source,
                customer.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_customer(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM customers WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn get_customer(&self, id: &str) -> SqliteResult<Option<Customer>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, company, email, phone, address, category, status, contact_person, credit_limit, balance, remark, source, created_at, updated_at FROM customers WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query([id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Customer {
                id: row.get(0)?, name: row.get(1)?, company: row.get(2)?, email: row.get(3)?,
                phone: row.get(4)?, address: row.get(5)?, category: row.get(6)?, status: row.get(7)?,
                contact_person: row.get(8)?, credit_limit: row.get(9)?, balance: row.get(10)?,
                remark: row.get(11)?, source: row.get(12)?, created_at: row.get(13)?, updated_at: row.get(14)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn list_customers(&self) -> SqliteResult<Vec<Customer>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, company, email, phone, address, category, status, contact_person, credit_limit, balance, remark, source, created_at, updated_at FROM customers ORDER BY created_at DESC"
        )?;
        
        let rows = stmt.query_map([], |row| {
            Ok(Customer {
                id: row.get(0)?, name: row.get(1)?, company: row.get(2)?, email: row.get(3)?,
                phone: row.get(4)?, address: row.get(5)?, category: row.get(6)?, status: row.get(7)?,
                contact_person: row.get(8)?, credit_limit: row.get(9)?, balance: row.get(10)?,
                remark: row.get(11)?, source: row.get(12)?, created_at: row.get(13)?, updated_at: row.get(14)?,
            })
        })?;
        rows.collect()
    }

    pub fn count_customers(&self) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM customers", [], |row| row.get(0))
    }

    // ==================== 产品 CRUD ====================

    pub fn create_product(&self, product: &Product) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO products (id, code, barcode, name, category, unit, specification, brand, cost_price, sell_price, min_stock, max_stock, current_stock, warehouse_id, location, status, description, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            params![
                product.id, product.code, product.barcode, product.name, product.category,
                product.unit, product.specification, product.brand, product.cost_price,
                product.sell_price, product.min_stock, product.max_stock, product.current_stock,
                product.warehouse_id, product.location, product.status, product.description,
                product.created_at, product.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn update_product(&self, product: &Product) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE products SET code=?2, barcode=?3, name=?4, category=?5, unit=?6, specification=?7, brand=?8, cost_price=?9, sell_price=?10, min_stock=?11, max_stock=?12, current_stock=?13, warehouse_id=?14, location=?15, status=?16, description=?17, updated_at=?18 WHERE id=?1",
            params![
                product.id, product.code, product.barcode, product.name, product.category,
                product.unit, product.specification, product.brand, product.cost_price,
                product.sell_price, product.min_stock, product.max_stock, product.current_stock,
                product.warehouse_id, product.location, product.status, product.description,
                product.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn delete_product(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM products WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn get_product(&self, id: &str) -> SqliteResult<Option<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, barcode, name, category, unit, specification, brand, cost_price, sell_price, min_stock, max_stock, current_stock, warehouse_id, location, status, description, created_at, updated_at FROM products WHERE id = ?1"
        )?;
        
        let mut rows = stmt.query([id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Self::row_to_product(row)?))
        } else {
            Ok(None)
        }
    }

    pub fn get_product_by_barcode(&self, barcode: &str) -> SqliteResult<Option<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, barcode, name, category, unit, specification, brand, cost_price, sell_price, min_stock, max_stock, current_stock, warehouse_id, location, status, description, created_at, updated_at FROM products WHERE barcode = ?1"
        )?;
        
        let mut rows = stmt.query([barcode])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Self::row_to_product(row)?))
        } else {
            Ok(None)
        }
    }

    fn row_to_product(row: &rusqlite::Row) -> SqliteResult<Product> {
        Ok(Product {
            id: row.get(0)?, code: row.get(1)?, barcode: row.get(2)?, name: row.get(3)?,
            category: row.get(4)?, unit: row.get(5)?, specification: row.get(6)?, brand: row.get(7)?,
            cost_price: row.get(8)?, sell_price: row.get(9)?, min_stock: row.get(10)?,
            max_stock: row.get(11)?, current_stock: row.get(12)?, warehouse_id: row.get(13)?,
            location: row.get(14)?, status: row.get(15)?, description: row.get(16)?,
            created_at: row.get(17)?, updated_at: row.get(18)?,
        })
    }

    pub fn list_products(&self) -> SqliteResult<Vec<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, barcode, name, category, unit, specification, brand, cost_price, sell_price, min_stock, max_stock, current_stock, warehouse_id, location, status, description, created_at, updated_at FROM products ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| Self::row_to_product(row))?;
        rows.collect()
    }

    pub fn list_low_stock_products(&self) -> SqliteResult<Vec<Product>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, barcode, name, category, unit, specification, brand, cost_price, sell_price, min_stock, max_stock, current_stock, warehouse_id, location, status, description, created_at, updated_at FROM products WHERE current_stock < min_stock"
        )?;
        let rows = stmt.query_map([], |row| Self::row_to_product(row))?;
        rows.collect()
    }

    pub fn count_products(&self) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM products", [], |row| row.get(0))
    }

    pub fn count_low_stock_products(&self) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM products WHERE current_stock < min_stock", [], |row| row.get(0))
    }

    pub fn update_stock(&self, product_id: &str, quantity_change: i32, record_type: &str, unit_price: f64, remark: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let current: i32 = conn.query_row("SELECT current_stock FROM products WHERE id = ?1", [product_id], |row| row.get(0))?;
        let new_stock = current + quantity_change;
        let now = Utc::now().to_rfc3339();
        
        conn.execute("UPDATE products SET current_stock = ?1, updated_at = ?2 WHERE id = ?3", params![new_stock, now, product_id])?;
        
        let record_id = uuid::Uuid::new_v4().to_string();
        conn.execute(
            "INSERT INTO stock_records (id, product_id, record_type, quantity, before_quantity, after_quantity, unit_price, total_amount, remark, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![record_id, product_id, record_type, quantity_change.abs(), current, new_stock, unit_price, (quantity_change.abs() as f64) * unit_price, remark, now]
        )?;
        Ok(())
    }

    // ==================== 订单 CRUD ====================

    pub fn create_order(&self, order: &Order) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO orders (id, code, order_type, customer_id, customer_name, status, total_quantity, total_amount, discount_amount, payable_amount, paid_amount, delivery_address, delivery_date, remark, operator_id, operator_name, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)",
            params![
                order.id, order.code, order.order_type, order.customer_id, order.customer_name,
                order.status, order.total_quantity, order.total_amount, order.discount_amount,
                order.payable_amount, order.paid_amount, order.delivery_address, order.delivery_date,
                order.remark, order.operator_id, order.operator_name, order.created_at, order.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn update_order(&self, order: &Order) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE orders SET customer_id=?2, customer_name=?3, status=?4, total_quantity=?5, total_amount=?6, discount_amount=?7, payable_amount=?8, paid_amount=?9, delivery_address=?10, delivery_date=?11, remark=?12, updated_at=?13 WHERE id=?1",
            params![
                order.id, order.customer_id, order.customer_name, order.status, order.total_quantity,
                order.total_amount, order.discount_amount, order.payable_amount, order.paid_amount,
                order.delivery_address, order.delivery_date, order.remark, order.updated_at
            ],
        )?;
        Ok(())
    }

    pub fn update_order_status(&self, id: &str, status: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();
        conn.execute("UPDATE orders SET status = ?1, updated_at = ?2 WHERE id = ?3", params![status, now, id])?;
        Ok(())
    }

    pub fn delete_order(&self, id: &str) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute("DELETE FROM order_items WHERE order_id = ?1", [id])?;
        conn.execute("DELETE FROM orders WHERE id = ?1", [id])?;
        Ok(())
    }

    pub fn get_order(&self, id: &str) -> SqliteResult<Option<Order>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, order_type, customer_id, customer_name, status, total_quantity, total_amount, discount_amount, payable_amount, paid_amount, delivery_address, delivery_date, remark, operator_id, operator_name, created_at, updated_at FROM orders WHERE id = ?1"
        )?;
        let mut rows = stmt.query([id])?;
        if let Some(row) = rows.next()? {
            Ok(Some(Self::row_to_order(row)?))
        } else {
            Ok(None)
        }
    }

    fn row_to_order(row: &rusqlite::Row) -> SqliteResult<Order> {
        Ok(Order {
            id: row.get(0)?, code: row.get(1)?, order_type: row.get(2)?, customer_id: row.get(3)?,
            customer_name: row.get(4)?, status: row.get(5)?, total_quantity: row.get(6)?,
            total_amount: row.get(7)?, discount_amount: row.get(8)?, payable_amount: row.get(9)?,
            paid_amount: row.get(10)?, delivery_address: row.get(11)?, delivery_date: row.get(12)?,
            remark: row.get(13)?, operator_id: row.get(14)?, operator_name: row.get(15)?,
            created_at: row.get(16)?, updated_at: row.get(17)?,
        })
    }

    pub fn list_orders(&self) -> SqliteResult<Vec<Order>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, code, order_type, customer_id, customer_name, status, total_quantity, total_amount, discount_amount, payable_amount, paid_amount, delivery_address, delivery_date, remark, operator_id, operator_name, created_at, updated_at FROM orders ORDER BY created_at DESC"
        )?;
        let rows = stmt.query_map([], |row| Self::row_to_order(row))?;
        rows.collect()
    }

    pub fn count_orders(&self) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        conn.query_row("SELECT COUNT(*) FROM orders", [], |row| row.get(0))
    }

    pub fn count_today_orders(&self) -> SqliteResult<i64> {
        let conn = self.conn.lock().unwrap();
        let today = Utc::now().format("%Y-%m-%d").to_string();
        conn.query_row("SELECT COUNT(*) FROM orders WHERE created_at LIKE ?1", [format!("{}%", today)], |row| row.get(0))
    }

    pub fn get_today_revenue(&self) -> SqliteResult<f64> {
        let conn = self.conn.lock().unwrap();
        let today = Utc::now().format("%Y-%m-%d").to_string();
        conn.query_row(
            "SELECT COALESCE(SUM(payable_amount), 0) FROM orders WHERE created_at LIKE ?1 AND order_type = 'sale' AND status != 'cancelled'",
            [format!("{}%", today)], |row| row.get(0)
        )
    }

    pub fn generate_order_code(&self, order_type: &str) -> String {
        let prefix = match order_type { "sale" => "SO", "purchase" => "PO", "return" => "RO", _ => "OD" };
        let timestamp = Utc::now().format("%Y%m%d%H%M%S");
        format!("{}{}", prefix, timestamp)
    }

    pub fn add_order_item(&self, item: &OrderItem) -> SqliteResult<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO order_items (id, order_id, product_id, product_name, product_code, unit, quantity, unit_price, discount, amount, remark) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            params![item.id, item.order_id, item.product_id, item.product_name, item.product_code, item.unit, item.quantity, item.unit_price, item.discount, item.amount, item.remark],
        )?;
        Ok(())
    }

    pub fn get_order_items(&self, order_id: &str) -> SqliteResult<Vec<OrderItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT id, order_id, product_id, product_name, product_code, unit, quantity, unit_price, discount, amount, remark FROM order_items WHERE order_id = ?1")?;
        let rows = stmt.query_map([order_id], |row| {
            Ok(OrderItem {
                id: row.get(0)?, order_id: row.get(1)?, product_id: row.get(2)?, product_name: row.get(3)?,
                product_code: row.get(4)?, unit: row.get(5)?, quantity: row.get(6)?, unit_price: row.get(7)?,
                discount: row.get(8)?, amount: row.get(9)?, remark: row.get(10)?,
            })
        })?;
        rows.collect()
    }
}
