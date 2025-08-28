package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	_ "modernc.org/sqlite" // pure Go SQLite driver

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"
)

// ===== Models =====

type Customer struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	City      string    `json:"city,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type Product struct {
	ID       int64  `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category,omitempty"`
}

type Order struct {
	ID         int64     `json:"id"`
	CustomerID int64     `json:"customer_id"`
	OrderDate  time.Time `json:"order_date"`
	Status     string    `json:"status"`
	// 可选：总金额（查询时计算）
	Total float64 `json:"total,omitempty"`
}

type OrderItem struct {
	ID        int64   `json:"id"`
	OrderID   int64   `json:"order_id"`
	ProductID int64   `json:"product_id"`
	Quantity  int64   `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

type Payment struct {
	ID      int64      `json:"id"`
	OrderID int64      `json:"order_id"`
	Amount  float64    `json:"amount"`
	PaidAt  *time.Time `json:"paid_at,omitempty"`
	Method  string     `json:"method,omitempty"`
}

// 请求结构：创建订单（含 items + 可选 payment）
type CreateOrderRequest struct {
	CustomerID int64              `json:"customer_id"`
	Status     string             `json:"status"`
	Items      []CreateOrderItem  `json:"items"`
	Payment    *CreatePaymentBody `json:"payment,omitempty"`
}

type CreateOrderItem struct {
	ProductID int64   `json:"product_id"`
	Quantity  int64   `json:"quantity"`
	UnitPrice float64 `json:"unit_price"`
}

type CreatePaymentBody struct {
	Amount float64 `json:"amount"`
	Method string  `json:"method"`
}

// ===== DB & bootstrap =====

func mustInitDB() *sql.DB {
	if err := os.MkdirAll("data", 0755); err != nil {
		log.Fatalf("mk data dir: %v", err)
	}
	dbPath := filepath.Join("data", "app.db")
	dsn := fmt.Sprintf("file:%s?_pragma=foreign_keys(1)", dbPath)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		log.Fatalf("open sqlite: %v", err)
	}
	db.SetMaxOpenConns(1) // SQLite 建议单连接（串行）
	if err := createSchema(db); err != nil {
		log.Fatalf("create schema: %v", err)
	}
	if err := seedData(db); err != nil {
		log.Fatalf("seed: %v", err)
	}
	return db
}

func createSchema(db *sql.DB) error {
	schema := `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS customers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  city        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  category   TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL,
  order_date   TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL,
  FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS order_items (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id    INTEGER NOT NULL,
  product_id  INTEGER NOT NULL,
  quantity    INTEGER NOT NULL,
  unit_price  REAL NOT NULL,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS payments (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id  INTEGER NOT NULL,
  amount    REAL NOT NULL,
  paid_at   TEXT,
  method    TEXT,
  FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
`
	_, err := db.Exec(schema)
	return err
}

func seedData(db *sql.DB) error {
	// 简单判断是否已有数据
	var n int
	if err := db.QueryRow("SELECT COUNT(*) FROM customers").Scan(&n); err != nil {
		return err
	}
	if n > 0 {
		return nil
	}

	tx, err := db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// customers
	customers := []Customer{
		{Name: "Alice", City: "Shanghai"},
		{Name: "Bob", City: "Beijing"},
		{Name: "Carol", City: "Shenzhen"},
	}
	for _, c := range customers {
		if _, err := tx.Exec(`INSERT INTO customers(name, city) VALUES(?, ?)`, c.Name, c.City); err != nil {
			return err
		}
	}

	// products
	products := []Product{
		{Name: "Mouse A", Category: "Peripherals"},
		{Name: "Keyboard B", Category: "Peripherals"},
		{Name: "Laptop C", Category: "Computer"},
	}
	for _, p := range products {
		if _, err := tx.Exec(`INSERT INTO products(name, category) VALUES(?, ?)`, p.Name, p.Category); err != nil {
			return err
		}
	}

	// 一个演示订单
	res, err := tx.Exec(`INSERT INTO orders(customer_id, status) VALUES(?, ?)`, 1, "PAID")
	if err != nil {
		return err
	}
	oid, _ := res.LastInsertId()
	if _, err := tx.Exec(`INSERT INTO order_items(order_id, product_id, quantity, unit_price) VALUES(?,?,?,?),
		(?,?,?,?)`, oid, 1, 2, 99.9, oid, 2, 1, 299.0); err != nil {
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339)
	if _, err := tx.Exec(`INSERT INTO payments(order_id, amount, paid_at, method) VALUES(?,?,?,?)`,
		oid, 498.8, now, "CARD"); err != nil {
		return err
	}

	return tx.Commit()
}

// ===== Helpers =====

func respondJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v != nil {
		_ = json.NewEncoder(w).Encode(v)
	}
}

func parseID(s string) (int64, error) {
	return strconv.ParseInt(s, 10, 64)
}

func parsePageSize(r *http.Request) (page, size int) {
	page = 1
	size = 20
	if v := r.URL.Query().Get("page"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			page = n
		}
	}
	if v := r.URL.Query().Get("size"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 100 {
			size = n
		}
	}
	return
}

func buildOrderBy(r *http.Request, allowed map[string]bool, defaultOrder string) string {
	sort := r.URL.Query().Get("sort")
	if sort == "" {
		return defaultOrder
	}
	// 格式：field:asc|desc
	parts := strings.Split(sort, ":")
	field := parts[0]
	dir := "ASC"
	if len(parts) > 1 && strings.EqualFold(parts[1], "desc") {
		dir = "DESC"
	}
	if !allowed[field] {
		return defaultOrder
	}
	return fmt.Sprintf("%s %s", field, dir)
}

// ===== Handlers =====

type Server struct {
	db *sql.DB
}

// ===== Static: serve admin.html at "/" =====
func (s *Server) serveAdmin(w http.ResponseWriter, r *http.Request) {
	// 首选读取项目根目录的 admin.html
	data, err := os.ReadFile("admin.html")
	if err != nil {
		// 友好提示：没找到 admin.html
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`<!doctype html><meta charset="utf-8">
<h1>admin.html 未找到</h1>
<p>请将 <code>admin.html</code> 放在后端可执行程序的工作目录下，或把它拷到项目根目录后重启。</p>`))
		return
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write(data)
}

// ===== Utils: open default browser =====
func openBrowser(url string) {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		// 兼容 Win7+：用 shell 的 URL 处理器打开
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default: // linux, bsd, etc.
		cmd = exec.Command("xdg-open", url)
	}
	_ = cmd.Start() // 非阻塞，不关心错误（比如服务器无GUI）
}

// ===== Swagger & OpenAPI =====

const swaggerHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>GoShop API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
  <style>
    body { margin:0; }
    .topbar { display:none; }
  </style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
  window.onload = () => {
    window.ui = SwaggerUIBundle({
      url: '/openapi.json',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis],
      layout: "BaseLayout"
    });
  };
</script>
</body>
</html>`

// 直接内嵌一份 OpenAPI 3.0 文档（与你的 API 对齐）
// 如需修改，改这里即可；也可改为从磁盘读取。
const openapiJSON = `{
  "openapi": "3.0.3",
  "info": {
    "title": "GoShop API (Go + SQLite)",
    "version": "1.0.0",
    "description": "Customers / Products / Orders / OrderItems / Payments + Stats"
  },
  "servers": [
    { "url": "http://127.0.0.1:8080" }
  ],
  "paths": {
    "/api/health": {
      "get": {
        "summary": "Health check",
        "responses": {
          "200": {
            "description": "OK",
            "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Health" } } }
          }
        }
      }
    },

    "/api/customers": {
      "get": {
        "summary": "List customers",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "minimum": 1 }, "description": "default 1" },
          { "name": "size", "in": "query", "schema": { "type": "integer", "minimum": 1, "maximum": 100 }, "description": "default 20" },
          { "name": "sort", "in": "query", "schema": { "type": "string" }, "description": "field:asc|desc, e.g. created_at:desc" },
          { "name": "city", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PageCustomers" } } } }
        }
      },
      "post": {
        "summary": "Create customer",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CustomerCreate" } } } },
        "responses": {
          "201": { "description": "Created", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Customer" } } } }
        }
      }
    },
    "/api/customers/{id}": {
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } }],
      "get": { "summary": "Get customer", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Customer" } } } }, "404": { "description": "Not Found" } } },
      "put": {
        "summary": "Update customer",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CustomerCreate" } } } },
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Customer" } } } } }
      },
      "delete": { "summary": "Delete customer", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DeleteResult" } } } } } }
    },

    "/api/products": {
      "get": {
        "summary": "List products",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "size", "in": "query", "schema": { "type": "integer" } },
          { "name": "sort", "in": "query", "schema": { "type": "string" } },
          { "name": "category", "in": "query", "schema": { "type": "string" } }
        ],
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PageProducts" } } } } }
      },
      "post": {
        "summary": "Create product",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ProductCreate" } } } },
        "responses": { "201": { "description": "Created", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Product" } } } } }
      }
    },
    "/api/products/{id}": {
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } }],
      "get": { "summary": "Get product", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Product" } } } }, "404": { "description": "Not Found" } } },
      "put": {
        "summary": "Update product",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/ProductCreate" } } } },
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Product" } } } } }
      },
      "delete": { "summary": "Delete product", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DeleteResult" } } } } } }
    },

    "/api/orders": {
      "get": {
        "summary": "List orders (with totals)",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "size", "in": "query", "schema": { "type": "integer" } },
          { "name": "sort", "in": "query", "schema": { "type": "string" } },
          { "name": "status", "in": "query", "schema": { "type": "string" } },
          { "name": "customer_id", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PageOrders" } } } } }
      },
      "post": {
        "summary": "Create order (atomic, with items and optional payment)",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateOrderRequest" } } } },
        "responses": {
          "201": { "description": "Created", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreateOrderResponse" } } } }
        }
      }
    },
    "/api/orders/{id}": {
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } }],
      "get": { "summary": "Get order (with total)", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Order" } } } }, "404": { "description": "Not Found" } } },
      "put": {
        "summary": "Update order status",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/UpdateOrderStatus" } } } },
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Order" } } } } }
      },
      "delete": { "summary": "Delete order (cascade delete items & payments)", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DeleteResult" } } } } } }
    },
    "/api/orders/{id}/items": {
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } }],
      "get": {
        "summary": "List order items",
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/OrderItem" } } } } } }
      }
    },

    "/api/payments": {
      "get": {
        "summary": "List payments",
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer" } },
          { "name": "size", "in": "query", "schema": { "type": "integer" } },
          { "name": "sort", "in": "query", "schema": { "type": "string" } },
          { "name": "order_id", "in": "query", "schema": { "type": "integer" } }
        ],
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/PagePayments" } } } } }
      },
      "post": {
        "summary": "Create payment",
        "requestBody": { "required": true, "content": { "application/json": { "schema": { "$ref": "#/components/schemas/CreatePayment" } } } },
        "responses": { "201": { "description": "Created", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Payment" } } } } }
      }
    },
    "/api/payments/{id}": {
      "parameters": [{ "name": "id", "in": "path", "required": true, "schema": { "type": "integer", "format": "int64" } }],
      "get": { "summary": "Get payment", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/Payment" } } } }, "404": { "description": "Not Found" } } },
      "delete": { "summary": "Delete payment", "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "$ref": "#/components/schemas/DeleteResult" } } } } } }
    },

    "/api/stats/daily-sales": {
      "get": {
        "summary": "Daily sales in a date range",
        "parameters": [
          { "name": "from", "in": "query", "required": true, "schema": { "type": "string", "example": "2025-08-01" } },
          { "name": "to",   "in": "query", "required": true, "schema": { "type": "string", "example": "2025-08-31" } }
        ],
        "responses": { "200": { "description": "OK", "content": { "application/json": { "schema": { "type": "array", "items": { "$ref": "#/components/schemas/DailySales" } } } } } }
      }
    }
  },
  "components": {
    "schemas": {
      "Health": {
        "type": "object",
        "properties": {
          "ok": { "type": "boolean" },
          "time": { "type": "string", "format": "date-time" }
        }
      },
      "DeleteResult": {
        "type": "object",
        "properties": { "deleted": { "type": "integer", "format": "int64" } }
      },

      "Customer": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "format": "int64" },
          "name": { "type": "string" },
          "city": { "type": "string", "nullable": true },
          "created_at": { "type": "string", "format": "date-time" }
        },
        "required": ["id","name","created_at"]
      },
      "CustomerCreate": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "city": { "type": "string" }
        },
        "required": ["name"]
      },
      "PageCustomers": {
        "type": "object",
        "properties": {
          "page": { "type": "integer" },
          "size": { "type": "integer" },
          "items": { "type": "array", "items": { "$ref": "#/components/schemas/Customer" } }
        }
      },

      "Product": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "format": "int64" },
          "name": { "type": "string" },
          "category": { "type": "string", "nullable": true }
        },
        "required": ["id","name"]
      },
      "ProductCreate": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "category": { "type": "string" }
        },
        "required": ["name"]
      },
      "PageProducts": {
        "type": "object",
        "properties": {
          "page": { "type": "integer" },
          "size": { "type": "integer" },
          "items": { "type": "array", "items": { "$ref": "#/components/schemas/Product" } }
        }
      },

      "Order": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "format": "int64" },
          "customer_id": { "type": "integer", "format": "int64" },
          "order_date": { "type": "string", "format": "date-time" },
          "status": { "type": "string", "example": "NEW/PAID/CANCEL" },
          "total": { "type": "number" }
        },
        "required": ["id","customer_id","order_date","status"]
      },
      "OrderItem": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "format": "int64" },
          "order_id": { "type": "integer", "format": "int64" },
          "product_id": { "type": "integer", "format": "int64" },
          "quantity": { "type": "integer" },
          "unit_price": { "type": "number" }
        },
        "required": ["id","order_id","product_id","quantity","unit_price"]
      },
      "CreateOrderItem": {
        "type": "object",
        "properties": {
          "product_id": { "type": "integer", "format": "int64" },
          "quantity": { "type": "integer" },
          "unit_price": { "type": "number" }
        },
        "required": ["product_id","quantity","unit_price"]
      },
      "CreatePaymentBody": {
        "type": "object",
        "properties": {
          "amount": { "type": "number" },
          "method": { "type": "string" }
        },
        "required": ["amount","method"]
      },
      "CreateOrderRequest": {
        "type": "object",
        "properties": {
          "customer_id": { "type": "integer", "format": "int64" },
          "status": { "type": "string", "example": "NEW/PAID/CANCEL" },
          "items": {
            "type": "array",
            "items": { "$ref": "#/components/schemas/CreateOrderItem" },
            "minItems": 1
          },
          "payment": { "$ref": "#/components/schemas/CreatePaymentBody" }
        },
        "required": ["customer_id","items"]
      },
      "CreateOrderResponse": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "format": "int64" },
          "customer_id": { "type": "integer", "format": "int64" },
          "status": { "type": "string" },
          "total": { "type": "number" }
        }
      },
      "UpdateOrderStatus": {
        "type": "object",
        "properties": { "status": { "type": "string" } },
        "required": ["status"]
      },
      "PageOrders": {
        "type": "object",
        "properties": {
          "page": { "type": "integer" },
          "size": { "type": "integer" },
          "items": { "type": "array", "items": { "$ref": "#/components/schemas/Order" } }
        }
      },

      "Payment": {
        "type": "object",
        "properties": {
          "id": { "type": "integer", "format": "int64" },
          "order_id": { "type": "integer", "format": "int64" },
          "amount": { "type": "number" },
          "paid_at": { "type": "string", "format": "date-time", "nullable": true },
          "method": { "type": "string", "nullable": true }
        },
        "required": ["id","order_id","amount"]
      },
      "CreatePayment": {
        "type": "object",
        "properties": {
          "order_id": { "type": "integer", "format": "int64" },
          "amount": { "type": "number" },
          "method": { "type": "string" }
        },
        "required": ["order_id","amount"]
      },
      "PagePayments": {
        "type": "object",
        "properties": {
          "page": { "type": "integer" },
          "size": { "type": "integer" },
          "items": { "type": "array", "items": { "$ref": "#/components/schemas/Payment" } }
        }
      },

      "DailySales": {
        "type": "object",
        "properties": {
          "date": { "type": "string", "example": "2025-08-20" },
          "sales": { "type": "number" }
        }
      }
    }
  }
}`

func (s *Server) serveSwaggerUI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(swaggerHTML))
}

func (s *Server) serveOpenAPI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write([]byte(openapiJSON))
}

func main() {
	db := mustInitDB()
	s := &Server{db: db}

	r := chi.NewRouter()
	// CORS（前端可直接调用）
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	r.Get("/swagger", s.serveSwaggerUI)
	r.Get("/openapi.json", s.serveOpenAPI)
	// 静态页面：根路径就返回 admin.html
	r.Get("/", s.serveAdmin)
	r.Get("/admin.html", s.serveAdmin)

	r.Route("/api", func(api chi.Router) {
		api.Get("/health", func(w http.ResponseWriter, r *http.Request) {
			respondJSON(w, 200, map[string]any{"ok": true, "time": time.Now()})
		})

		// customers
		api.Get("/customers", s.listCustomers)
		api.Post("/customers", s.createCustomer)
		api.Route("/customers/{id}", func(r chi.Router) {
			r.Get("/", s.getCustomer)
			r.Put("/", s.updateCustomer)
			r.Delete("/", s.deleteCustomer)
		})

		// products
		api.Get("/products", s.listProducts)
		api.Post("/products", s.createProduct)
		api.Route("/products/{id}", func(r chi.Router) {
			r.Get("/", s.getProduct)
			r.Put("/", s.updateProduct)
			r.Delete("/", s.deleteProduct)
		})

		// orders
		api.Get("/orders", s.listOrders)
		api.Post("/orders", s.createOrder)
		api.Route("/orders/{id}", func(r chi.Router) {
			r.Get("/", s.getOrder)
			r.Put("/", s.updateOrder) // 仅更新 status
			r.Delete("/", s.deleteOrder)
			r.Get("/items", s.listOrderItems)
		})

		// payments
		api.Get("/payments", s.listPayments)
		api.Post("/payments", s.createPayment)
		api.Route("/payments/{id}", func(r chi.Router) {
			r.Get("/", s.getPayment)
			r.Delete("/", s.deletePayment)
		})

		// stats
		api.Get("/stats/daily-sales", s.dailySales)
	})

	addr := ":8080"
	log.Printf("listening on %s ...", addr)

	// 自动打开浏览器：等待后端就绪（探测 /api/health），然后打开 /
	go func() {
		base := "http://127.0.0.1:8080"
		// 探活，最多等 5 秒
		deadline := time.Now().Add(5 * time.Second)
		for time.Now().Before(deadline) {
			resp, err := http.Get(base + "/api/health")
			if err == nil && resp.StatusCode == http.StatusOK {
				resp.Body.Close()
				openBrowser(base + "/") // 打开 admin.html（由 "/" 提供）
				return
			}
			if resp != nil {
				resp.Body.Close()
			}
			time.Sleep(200 * time.Millisecond)
		}
	}()

	log.Fatal(http.ListenAndServe(addr, r))
}

// ========== Customers ==========

func (s *Server) listCustomers(w http.ResponseWriter, r *http.Request) {
	page, size := parsePageSize(r)
	orderBy := buildOrderBy(r, map[string]bool{"id": true, "created_at": true, "name": true}, "id DESC")
	offset := (page - 1) * size

	where := "1=1"
	args := []any{}
	if city := r.URL.Query().Get("city"); city != "" {
		where += " AND city = ?"
		args = append(args, city)
	}

	q := fmt.Sprintf(`SELECT id, name, city, created_at FROM customers WHERE %s ORDER BY %s LIMIT ? OFFSET ?`, where, orderBy)
	args = append(args, size, offset)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	var out []Customer
	for rows.Next() {
		var c Customer
		var created string
		if err := rows.Scan(&c.ID, &c.Name, &c.City, &created); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		c.CreatedAt, _ = time.Parse(time.RFC3339, created)
		out = append(out, c)
	}
	respondJSON(w, 200, map[string]any{"page": page, "size": size, "items": out})
}

func (s *Server) createCustomer(w http.ResponseWriter, r *http.Request) {
	var in Customer
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name required", 400)
		return
	}
	res, err := s.db.Exec(`INSERT INTO customers(name, city) VALUES(?,?)`, in.Name, in.City)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	id, _ := res.LastInsertId()
	var created string
	_ = s.db.QueryRow(`SELECT created_at FROM customers WHERE id=?`, id).Scan(&created)
	t, _ := time.Parse(time.RFC3339, created)
	respondJSON(w, 201, Customer{ID: id, Name: in.Name, City: in.City, CreatedAt: t})
}

func (s *Server) getCustomer(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var c Customer
	var created string
	err := s.db.QueryRow(`SELECT id,name,city,created_at FROM customers WHERE id=?`, id).
		Scan(&c.ID, &c.Name, &c.City, &created)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	c.CreatedAt, _ = time.Parse(time.RFC3339, created)
	respondJSON(w, 200, c)
}

func (s *Server) updateCustomer(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var in Customer
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name required", 400)
		return
	}
	_, err := s.db.Exec(`UPDATE customers SET name=?, city=? WHERE id=?`, in.Name, in.City, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.getCustomer(w, r)
}

func (s *Server) deleteCustomer(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	_, err := s.db.Exec(`DELETE FROM customers WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	respondJSON(w, 200, map[string]any{"deleted": id})
}

// ========== Products ==========

func (s *Server) listProducts(w http.ResponseWriter, r *http.Request) {
	page, size := parsePageSize(r)
	orderBy := buildOrderBy(r, map[string]bool{"id": true, "name": true}, "id DESC")
	offset := (page - 1) * size

	where := "1=1"
	args := []any{}
	if cat := r.URL.Query().Get("category"); cat != "" {
		where += " AND category = ?"
		args = append(args, cat)
	}

	q := fmt.Sprintf(`SELECT id,name,category FROM products WHERE %s ORDER BY %s LIMIT ? OFFSET ?`, where, orderBy)
	args = append(args, size, offset)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var out []Product
	for rows.Next() {
		var p Product
		if err := rows.Scan(&p.ID, &p.Name, &p.Category); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		out = append(out, p)
	}
	respondJSON(w, 200, map[string]any{"page": page, "size": size, "items": out})
}

func (s *Server) createProduct(w http.ResponseWriter, r *http.Request) {
	var in Product
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name required", 400)
		return
	}
	res, err := s.db.Exec(`INSERT INTO products(name, category) VALUES(?,?)`, in.Name, in.Category)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	id, _ := res.LastInsertId()
	respondJSON(w, 201, Product{ID: id, Name: in.Name, Category: in.Category})
}

func (s *Server) getProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var p Product
	err := s.db.QueryRow(`SELECT id,name,category FROM products WHERE id=?`, id).
		Scan(&p.ID, &p.Name, &p.Category)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	respondJSON(w, 200, p)
}

func (s *Server) updateProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var in Product
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if strings.TrimSpace(in.Name) == "" {
		http.Error(w, "name required", 400)
		return
	}
	_, err := s.db.Exec(`UPDATE products SET name=?, category=? WHERE id=?`, in.Name, in.Category, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.getProduct(w, r)
}

func (s *Server) deleteProduct(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	_, err := s.db.Exec(`DELETE FROM products WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	respondJSON(w, 200, map[string]any{"deleted": id})
}

// ========== Orders ==========

func (s *Server) listOrders(w http.ResponseWriter, r *http.Request) {
	page, size := parsePageSize(r)
	orderBy := buildOrderBy(r, map[string]bool{"id": true, "order_date": true}, "order_date DESC")
	offset := (page - 1) * size

	where := "1=1"
	args := []any{}
	if status := r.URL.Query().Get("status"); status != "" {
		where += " AND status = ?"
		args = append(args, status)
	}
	if cid := r.URL.Query().Get("customer_id"); cid != "" {
		where += " AND customer_id = ?"
		args = append(args, cid)
	}

	// 同时返回总金额（明细汇总）
	q := fmt.Sprintf(`
SELECT o.id, o.customer_id, o.order_date, o.status,
       IFNULL(SUM(oi.quantity * oi.unit_price), 0) AS total
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE %s
GROUP BY o.id
ORDER BY %s
LIMIT ? OFFSET ?`, where, orderBy)
	args = append(args, size, offset)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	type Row struct {
		Order
	}
	var out []Row
	for rows.Next() {
		var o Order
		var dateStr string
		if err := rows.Scan(&o.ID, &o.CustomerID, &dateStr, &o.Status, &o.Total); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		o.OrderDate, _ = time.Parse(time.RFC3339, dateStr)
		out = append(out, Row{Order: o})
	}
	respondJSON(w, 200, map[string]any{"page": page, "size": size, "items": out})
}

func (s *Server) createOrder(w http.ResponseWriter, r *http.Request) {
	var in CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if in.CustomerID == 0 || len(in.Items) == 0 {
		http.Error(w, "customer_id and items required", 400)
		return
	}
	if in.Status == "" {
		in.Status = "NEW"
	}

	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{})
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer tx.Rollback()

	// 创建订单
	res, err := tx.ExecContext(ctx, `INSERT INTO orders(customer_id, status) VALUES(?, ?)`, in.CustomerID, in.Status)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	orderID, _ := res.LastInsertId()

	// 插入明细
	stmt, err := tx.PrepareContext(ctx, `INSERT INTO order_items(order_id, product_id, quantity, unit_price) VALUES(?,?,?,?)`)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer stmt.Close()

	var total float64
	for _, it := range in.Items {
		if it.ProductID == 0 || it.Quantity <= 0 || it.UnitPrice < 0 {
			http.Error(w, "invalid item", 400)
			return
		}
		if _, err := stmt.ExecContext(ctx, orderID, it.ProductID, it.Quantity, it.UnitPrice); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		total += float64(it.Quantity) * it.UnitPrice
	}

	// 可选：付款
	if in.Payment != nil {
		now := time.Now().UTC().Format(time.RFC3339)
		if _, err := tx.ExecContext(ctx, `INSERT INTO payments(order_id, amount, paid_at, method) VALUES(?,?,?,?)`,
			orderID, in.Payment.Amount, now, in.Payment.Method); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}

	if err := tx.Commit(); err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	respondJSON(w, 201, map[string]any{
		"id":          orderID,
		"customer_id": in.CustomerID,
		"status":      in.Status,
		"total":       total,
	})
}

func (s *Server) getOrder(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var o Order
	var dateStr string
	err := s.db.QueryRow(`
SELECT o.id, o.customer_id, o.order_date, o.status,
       IFNULL(SUM(oi.quantity * oi.unit_price), 0) AS total
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.id = ?
GROUP BY o.id
`, id).Scan(&o.ID, &o.CustomerID, &dateStr, &o.Status, &o.Total)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	o.OrderDate, _ = time.Parse(time.RFC3339, dateStr)
	respondJSON(w, 200, o)
}

func (s *Server) updateOrder(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var in struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if in.Status == "" {
		http.Error(w, "status required", 400)
		return
	}
	_, err := s.db.Exec(`UPDATE orders SET status=? WHERE id=?`, in.Status, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	s.getOrder(w, r)
}

func (s *Server) deleteOrder(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	_, err := s.db.Exec(`DELETE FROM orders WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	respondJSON(w, 200, map[string]any{"deleted": id})
}

func (s *Server) listOrderItems(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	rows, err := s.db.Query(`
SELECT id, order_id, product_id, quantity, unit_price
FROM order_items WHERE order_id=? ORDER BY id`, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var out []OrderItem
	for rows.Next() {
		var it OrderItem
		if err := rows.Scan(&it.ID, &it.OrderID, &it.ProductID, &it.Quantity, &it.UnitPrice); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		out = append(out, it)
	}
	respondJSON(w, 200, out)
}

// ========== Payments ==========

func (s *Server) listPayments(w http.ResponseWriter, r *http.Request) {
	page, size := parsePageSize(r)
	orderBy := buildOrderBy(r, map[string]bool{"id": true, "paid_at": true, "amount": true}, "id DESC")
	offset := (page - 1) * size

	where := "1=1"
	args := []any{}
	if oid := r.URL.Query().Get("order_id"); oid != "" {
		where += " AND order_id = ?"
		args = append(args, oid)
	}

	q := fmt.Sprintf(`SELECT id, order_id, amount, paid_at, method FROM payments WHERE %s ORDER BY %s LIMIT ? OFFSET ?`, where, orderBy)
	args = append(args, size, offset)

	rows, err := s.db.Query(q, args...)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()
	var out []Payment
	for rows.Next() {
		var p Payment
		var paid *string
		if err := rows.Scan(&p.ID, &p.OrderID, &p.Amount, &paid, &p.Method); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		if paid != nil {
			t, _ := time.Parse(time.RFC3339, *paid)
			p.PaidAt = &t
		}
		out = append(out, p)
	}
	respondJSON(w, 200, map[string]any{"page": page, "size": size, "items": out})
}

func (s *Server) createPayment(w http.ResponseWriter, r *http.Request) {
	var in struct {
		OrderID int64   `json:"order_id"`
		Amount  float64 `json:"amount"`
		Method  string  `json:"method"`
	}
	if err := json.NewDecoder(r.Body).Decode(&in); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	if in.OrderID == 0 || in.Amount <= 0 {
		http.Error(w, "order_id and positive amount required", 400)
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	res, err := s.db.Exec(`INSERT INTO payments(order_id, amount, paid_at, method) VALUES(?,?,?,?)`,
		in.OrderID, in.Amount, now, in.Method)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	id, _ := res.LastInsertId()
	t, _ := time.Parse(time.RFC3339, now)
	respondJSON(w, 201, Payment{ID: id, OrderID: in.OrderID, Amount: in.Amount, PaidAt: &t, Method: in.Method})
}

func (s *Server) getPayment(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	var p Payment
	var paid *string
	err := s.db.QueryRow(`SELECT id, order_id, amount, paid_at, method FROM payments WHERE id=?`, id).
		Scan(&p.ID, &p.OrderID, &p.Amount, &paid, &p.Method)
	if errors.Is(err, sql.ErrNoRows) {
		http.NotFound(w, r)
		return
	}
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	if paid != nil {
		t, _ := time.Parse(time.RFC3339, *paid)
		p.PaidAt = &t
	}
	respondJSON(w, 200, p)
}

func (s *Server) deletePayment(w http.ResponseWriter, r *http.Request) {
	id, _ := parseID(chi.URLParam(r, "id"))
	_, err := s.db.Exec(`DELETE FROM payments WHERE id=?`, id)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	respondJSON(w, 200, map[string]any{"deleted": id})
}

// ========== Stats ==========

func (s *Server) dailySales(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")
	if from == "" || to == "" {
		http.Error(w, "from/to required (YYYY-MM-DD)", 400)
		return
	}
	// 聚合订单明细得每日销售额
	q := `
SELECT DATE(o.order_date) AS d,
       IFNULL(SUM(oi.quantity * oi.unit_price), 0) AS sales
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE DATE(o.order_date) >= DATE(?)
  AND DATE(o.order_date) <= DATE(?)
GROUP BY DATE(o.order_date)
ORDER BY d;
`
	rows, err := s.db.Query(q, from, to)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	type Row struct {
		Date  string  `json:"date"`
		Sales float64 `json:"sales"`
	}
	var out []Row
	for rows.Next() {
		var r Row
		if err := rows.Scan(&r.Date, &r.Sales); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		out = append(out, r)
	}
	respondJSON(w, 200, out)
}
