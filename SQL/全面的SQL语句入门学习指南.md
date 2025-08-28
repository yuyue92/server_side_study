# SQL语句入门学习指南

## 目录
1. [数据库基础概念](#数据库基础概念)
2. [数据查询 (SELECT)](#数据查询-select)
3. [数据插入 (INSERT)](#数据插入-insert)
4. [数据更新 (UPDATE)](#数据更新-update)
5. [数据删除 (DELETE)](#数据删除-delete)
6. [表结构操作 (CREATE/ALTER/DROP)](#表结构操作-createalterdrop)
7. [条件查询 (WHERE)](#条件查询-where)
8. [排序与分组 (ORDER BY/GROUP BY)](#排序与分组-order-bygroup-by)
9. [表连接 (JOIN)](#表连接-join)
10. [子查询与嵌套查询](#子查询与嵌套查询)
11. [聚合函数](#聚合函数)
12. [高级查询技巧](#高级查询技巧)
13. [索引与性能优化](#索引与性能优化)
14. [实战练习](#实战练习)

---

## 数据库基础概念

### 关键术语
- **数据库 (Database)**: 存储数据的容器
- **表 (Table)**: 数据的结构化存储单位
- **行 (Row/Record)**: 表中的一条数据记录
- **列 (Column/Field)**: 表中的数据字段
- **主键 (Primary Key)**: 唯一标识每行数据的字段
- **外键 (Foreign Key)**: 关联其他表的字段

### 示例表结构
```sql
-- 用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    age INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 订单表
CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    product_name VARCHAR(100),
    price DECIMAL(10,2),
    order_date DATE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 数据查询 (SELECT)

### 基本语法
```sql
SELECT 列名1, 列名2, ...
FROM 表名
[WHERE 条件]
[ORDER BY 排序字段]
[LIMIT 数量];
```

### 实用示例

#### 1. 基础查询
```sql
-- 查询所有列
SELECT * FROM users;

-- 查询指定列
SELECT username, email FROM users;

-- 查询前10条记录
SELECT * FROM users LIMIT 10;

-- 查询唯一值
SELECT DISTINCT age FROM users;
```

#### 2. 使用别名 (AS)
```sql
-- 列别名
SELECT username AS 用户名, email AS 邮箱 FROM users;

-- 表别名
SELECT u.username, u.email 
FROM users AS u;

-- 计算字段别名
SELECT username, age, (2024 - age) AS birth_year 
FROM users;
```

#### 3. 条件查询
```sql
-- 单条件
SELECT * FROM users WHERE age > 18;

-- 多条件 (AND)
SELECT * FROM users WHERE age > 18 AND age < 65;

-- 多条件 (OR)
SELECT * FROM users WHERE age < 18 OR age > 65;

-- 范围查询
SELECT * FROM users WHERE age BETWEEN 18 AND 65;

-- 列表查询
SELECT * FROM users WHERE age IN (18, 25, 30, 35);

-- 模糊查询
SELECT * FROM users WHERE username LIKE 'admin%';  -- 以admin开头
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- 以@gmail.com结尾
SELECT * FROM users WHERE username LIKE '%test%';  -- 包含test

-- 空值查询
SELECT * FROM users WHERE email IS NULL;
SELECT * FROM users WHERE email IS NOT NULL;
```

---

## 数据插入 (INSERT)

### 基本语法
```sql
INSERT INTO 表名 (列1, 列2, ...) VALUES (值1, 值2, ...);
```

### 实用示例

#### 1. 插入单条记录
```sql
-- 指定列插入
INSERT INTO users (username, email, age) 
VALUES ('张三', 'zhangsan@email.com', 25);

-- 插入所有列（按表结构顺序）
INSERT INTO users VALUES (NULL, '李四', 'lisi@email.com', 30, NOW());
```

#### 2. 批量插入
```sql
-- 插入多条记录
INSERT INTO users (username, email, age) VALUES 
('王五', 'wangwu@email.com', 28),
('赵六', 'zhaoliu@email.com', 22),
('孙七', 'sunqi@email.com', 35);
```

#### 3. 从查询结果插入
```sql
-- 从其他表插入数据
INSERT INTO users_backup (username, email, age)
SELECT username, email, age FROM users WHERE age > 30;
```

#### 4. 插入时处理重复
```sql
-- 忽略重复记录
INSERT IGNORE INTO users (username, email, age) 
VALUES ('张三', 'zhangsan@email.com', 25);

-- 重复时更新
INSERT INTO users (username, email, age) 
VALUES ('张三', 'zhangsan_new@email.com', 26)
ON DUPLICATE KEY UPDATE email = VALUES(email), age = VALUES(age);
```

---

## 数据更新 (UPDATE)

### 基本语法
```sql
UPDATE 表名 SET 列1 = 值1, 列2 = 值2, ... WHERE 条件;
```

### 实用示例

#### 1. 单表更新
```sql
-- 更新单个字段
UPDATE users SET age = 26 WHERE username = '张三';

-- 更新多个字段
UPDATE users SET email = 'new_email@example.com', age = 27 
WHERE id = 1;

-- 批量更新
UPDATE users SET age = age + 1 WHERE age < 30;

-- 条件更新
UPDATE users SET email = CONCAT(username, '@company.com') 
WHERE email IS NULL;
```

#### 2. 关联表更新
```sql
-- 使用JOIN更新
UPDATE users u 
JOIN orders o ON u.id = o.user_id 
SET u.last_order_date = o.order_date 
WHERE o.order_date = (
    SELECT MAX(order_date) FROM orders WHERE user_id = u.id
);
```

---

## 数据删除 (DELETE)

### 基本语法
```sql
DELETE FROM 表名 WHERE 条件;
```

### 实用示例

#### 1. 基础删除
```sql
-- 删除指定记录
DELETE FROM users WHERE id = 1;

-- 条件删除
DELETE FROM users WHERE age > 65 AND last_login < '2023-01-01';

-- 删除所有记录（保留表结构）
DELETE FROM users;
-- 或者使用 TRUNCATE（更快）
TRUNCATE TABLE users;
```

#### 2. 关联删除
```sql
-- 删除没有订单的用户
DELETE FROM users 
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders WHERE user_id IS NOT NULL);
```

---

## 表结构操作 (CREATE/ALTER/DROP)

### CREATE TABLE - 创建表
```sql
-- 基础创建表
CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) DEFAULT 0.00,
    category_id INT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 从查询结果创建表
CREATE TABLE users_backup AS 
SELECT * FROM users WHERE created_at > '2023-01-01';
```

### ALTER TABLE - 修改表结构
```sql
-- 添加列
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
ALTER TABLE users ADD COLUMN status ENUM('active', 'inactive') DEFAULT 'active';

-- 修改列
ALTER TABLE users MODIFY COLUMN phone VARCHAR(30);
ALTER TABLE users CHANGE COLUMN phone mobile VARCHAR(30);

-- 删除列
ALTER TABLE users DROP COLUMN mobile;

-- 添加索引
ALTER TABLE users ADD INDEX idx_email (email);
ALTER TABLE users ADD UNIQUE KEY uk_username (username);

-- 删除索引
ALTER TABLE users DROP INDEX idx_email;

-- 添加外键
ALTER TABLE orders ADD CONSTRAINT fk_user 
FOREIGN KEY (user_id) REFERENCES users(id);

-- 删除外键
ALTER TABLE orders DROP FOREIGN KEY fk_user;
```

### DROP - 删除表/数据库
```sql
-- 删除表
DROP TABLE IF EXISTS temp_table;

-- 删除数据库
DROP DATABASE IF EXISTS test_db;
```

---

## 条件查询 (WHERE)

### 比较运算符
```sql
-- 等于
SELECT * FROM users WHERE age = 25;

-- 不等于
SELECT * FROM users WHERE age != 25;
SELECT * FROM users WHERE age <> 25;

-- 大于、小于
SELECT * FROM users WHERE age > 18;
SELECT * FROM users WHERE age >= 18;
SELECT * FROM users WHERE age < 65;
SELECT * FROM users WHERE age <= 65;
```

### 逻辑运算符
```sql
-- AND 运算符
SELECT * FROM users WHERE age > 18 AND age < 65;

-- OR 运算符
SELECT * FROM users WHERE age < 18 OR age > 65;

-- NOT 运算符
SELECT * FROM users WHERE NOT (age BETWEEN 18 AND 65);
```

### 特殊条件
```sql
-- BETWEEN 范围查询
SELECT * FROM orders WHERE order_date BETWEEN '2023-01-01' AND '2023-12-31';

-- IN 列表查询
SELECT * FROM users WHERE age IN (18, 25, 30, 35);

-- LIKE 模糊查询
SELECT * FROM users WHERE username LIKE 'admin%';    -- 以admin开头
SELECT * FROM users WHERE email LIKE '%@gmail.com';  -- 以@gmail.com结尾
SELECT * FROM users WHERE username LIKE '%test%';    -- 包含test
SELECT * FROM users WHERE username LIKE 'user_';     -- user_加一个字符

-- REGEXP 正则表达式
SELECT * FROM users WHERE email REGEXP '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$';

-- IS NULL / IS NOT NULL
SELECT * FROM users WHERE email IS NULL;
SELECT * FROM users WHERE email IS NOT NULL;
```

---

## 排序与分组 (ORDER BY/GROUP BY)

### ORDER BY - 排序
```sql
-- 单字段排序
SELECT * FROM users ORDER BY age;          -- 升序（默认）
SELECT * FROM users ORDER BY age ASC;      -- 升序
SELECT * FROM users ORDER BY age DESC;     -- 降序

-- 多字段排序
SELECT * FROM users ORDER BY age DESC, username ASC;

-- 按计算字段排序
SELECT *, (price * quantity) AS total 
FROM order_items 
ORDER BY total DESC;

-- 自定义排序
SELECT * FROM users 
ORDER BY FIELD(status, 'active', 'pending', 'inactive');
```

### GROUP BY - 分组
```sql
-- 基础分组
SELECT age, COUNT(*) as user_count 
FROM users 
GROUP BY age;

-- 多字段分组
SELECT age, status, COUNT(*) as count 
FROM users 
GROUP BY age, status;

-- 分组后筛选 (HAVING)
SELECT age, COUNT(*) as user_count 
FROM users 
GROUP BY age 
HAVING COUNT(*) > 5;

-- 分组统计示例
SELECT 
    category_id,
    COUNT(*) as product_count,
    AVG(price) as avg_price,
    MAX(price) as max_price,
    MIN(price) as min_price,
    SUM(price) as total_price
FROM products 
GROUP BY category_id
HAVING AVG(price) > 100
ORDER BY avg_price DESC;
```

---

## 表连接 (JOIN)

### JOIN 类型图解
```
LEFT JOIN:  返回左表所有记录 + 右表匹配记录
RIGHT JOIN: 返回右表所有记录 + 左表匹配记录
INNER JOIN: 返回两表匹配的记录
FULL JOIN:  返回两表所有记录（MySQL不直接支持，用UNION实现）
```

### INNER JOIN - 内连接
```sql
-- 基础内连接
SELECT u.username, o.product_name, o.price
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- 多表内连接
SELECT u.username, o.product_name, c.category_name
FROM users u
INNER JOIN orders o ON u.id = o.user_id
INNER JOIN categories c ON o.category_id = c.id;
```

### LEFT JOIN - 左连接
```sql
-- 左连接（显示所有用户，包括没有订单的）
SELECT u.username, o.product_name, o.price
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- 查找没有订单的用户
SELECT u.username
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE o.user_id IS NULL;
```

### RIGHT JOIN - 右连接
```sql
-- 右连接（显示所有订单，包括用户信息不存在的）
SELECT u.username, o.product_name, o.price
FROM users u
RIGHT JOIN orders o ON u.id = o.user_id;
```

### CROSS JOIN - 交叉连接
```sql
-- 笛卡尔积（慎用，数据量大时会很慢）
SELECT u.username, p.product_name
FROM users u
CROSS JOIN products p;
```

### 自连接 (Self Join)
```sql
-- 查找同年龄的用户
SELECT u1.username AS user1, u2.username AS user2, u1.age
FROM users u1
INNER JOIN users u2 ON u1.age = u2.age AND u1.id < u2.id;

-- 员工和上级关系（假设有manager_id字段）
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON e.manager_id = m.id;
```

---

## 子查询与嵌套查询

### 标量子查询（返回单个值）
```sql
-- 查找年龄大于平均年龄的用户
SELECT username, age
FROM users
WHERE age > (SELECT AVG(age) FROM users);

-- 查找价格最高的产品
SELECT product_name, price
FROM products
WHERE price = (SELECT MAX(price) FROM products);
```

### 列子查询（返回一列多行）
```sql
-- 查找有订单的用户
SELECT username
FROM users
WHERE id IN (SELECT DISTINCT user_id FROM orders WHERE user_id IS NOT NULL);

-- 查找没有订单的用户
SELECT username
FROM users
WHERE id NOT IN (SELECT DISTINCT user_id FROM orders WHERE user_id IS NOT NULL);
```

### 表子查询（返回多行多列）
```sql
-- 查找每个用户的最新订单
SELECT u.username, latest_orders.product_name, latest_orders.order_date
FROM users u
INNER JOIN (
    SELECT user_id, product_name, order_date,
           ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY order_date DESC) as rn
    FROM orders
) latest_orders ON u.id = latest_orders.user_id AND latest_orders.rn = 1;
```

### EXISTS 子查询
```sql
-- 查找有订单的用户
SELECT username
FROM users u
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- 查找没有订单的用户
SELECT username
FROM users u
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

---

## 聚合函数

### 基础聚合函数
```sql
-- COUNT - 计数
SELECT COUNT(*) FROM users;                    -- 总行数
SELECT COUNT(email) FROM users;               -- 非空email数量
SELECT COUNT(DISTINCT age) FROM users;        -- 不同年龄数量

-- SUM - 求和
SELECT SUM(price) FROM orders;                -- 总金额
SELECT SUM(price * quantity) FROM order_items; -- 计算总价

-- AVG - 平均值
SELECT AVG(age) FROM users;                   -- 平均年龄
SELECT AVG(price) FROM products;             -- 平均价格

-- MAX/MIN - 最大值/最小值
SELECT MAX(age), MIN(age) FROM users;        -- 最大/最小年龄
SELECT MAX(order_date) FROM orders;          -- 最新订单日期
```

### 字符串函数
```sql
-- 字符串连接
SELECT CONCAT(username, ' (', age, ')') AS user_info FROM users;

-- 字符串长度
SELECT username, LENGTH(username) AS name_length FROM users;

-- 字符串截取
SELECT LEFT(username, 3) AS prefix FROM users;
SELECT RIGHT(email, 10) AS domain FROM users;
SELECT SUBSTRING(email, 1, 5) AS partial_email FROM users;

-- 大小写转换
SELECT UPPER(username), LOWER(email) FROM users;

-- 字符串替换
SELECT REPLACE(email, '@', ' AT ') FROM users;

-- 去除空格
SELECT TRIM(username) FROM users;
SELECT LTRIM(username), RTRIM(username) FROM users;
```

### 日期时间函数
```sql
-- 当前时间
SELECT NOW(), CURDATE(), CURTIME();

-- 日期格式化
SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date_only FROM users;
SELECT DATE_FORMAT(created_at, '%Y年%m月%d日') AS chinese_date FROM users;

-- 日期计算
SELECT username, DATEDIFF(NOW(), created_at) AS days_since_created FROM users;
SELECT DATE_ADD(NOW(), INTERVAL 30 DAY) AS future_date;
SELECT DATE_SUB(NOW(), INTERVAL 1 YEAR) AS past_date;

-- 提取日期部分
SELECT YEAR(created_at), MONTH(created_at), DAY(created_at) FROM users;
```

### 数学函数
```sql
-- 四舍五入
SELECT ROUND(price, 2) FROM products;
SELECT CEIL(price) AS ceiling, FLOOR(price) AS floor FROM products;

-- 随机数
SELECT RAND() AS random_number;
SELECT * FROM users ORDER BY RAND() LIMIT 5;  -- 随机5个用户

-- 绝对值
SELECT ABS(profit) FROM financial_records;
```

---

## 高级查询技巧

### WITH 子句 (Common Table Expression - CTE)
```sql
-- 基础CTE
WITH user_stats AS (
    SELECT 
        age,
        COUNT(*) as user_count,
        AVG(order_total) as avg_order
    FROM users u
    LEFT JOIN (
        SELECT user_id, SUM(price) as order_total
        FROM orders
        GROUP BY user_id
    ) o ON u.id = o.user_id
    GROUP BY age
)
SELECT * FROM user_stats WHERE user_count > 10;

-- 递归CTE（组织架构示例）
WITH RECURSIVE employee_hierarchy AS (
    -- 根节点（CEO）
    SELECT id, name, manager_id, 1 as level
    FROM employees
    WHERE manager_id IS NULL
    
    UNION ALL
    
    -- 递归部分
    SELECT e.id, e.name, e.manager_id, eh.level + 1
    FROM employees e
    INNER JOIN employee_hierarchy eh ON e.manager_id = eh.id
)
SELECT * FROM employee_hierarchy ORDER BY level, name;
```

### 窗口函数 (Window Functions)
```sql
-- ROW_NUMBER() - 行号
SELECT 
    username,
    age,
    ROW_NUMBER() OVER (ORDER BY age DESC) as age_rank
FROM users;

-- RANK() / DENSE_RANK() - 排名
SELECT 
    username,
    age,
    RANK() OVER (ORDER BY age DESC) as rank_with_gaps,
    DENSE_RANK() OVER (ORDER BY age DESC) as dense_rank
FROM users;

-- PARTITION BY - 分组窗口
SELECT 
    username,
    age,
    status,
    ROW_NUMBER() OVER (PARTITION BY status ORDER BY age DESC) as rank_in_status
FROM users;

-- LAG() / LEAD() - 前后行数据
SELECT 
    username,
    age,
    LAG(age, 1) OVER (ORDER BY age) as prev_age,
    LEAD(age, 1) OVER (ORDER BY age) as next_age
FROM users;

-- 累计和
SELECT 
    order_date,
    price,
    SUM(price) OVER (ORDER BY order_date) as running_total
FROM orders;
```

### CASE WHEN 条件表达式
```sql
-- 简单CASE
SELECT 
    username,
    age,
    CASE 
        WHEN age < 18 THEN '未成年'
        WHEN age BETWEEN 18 AND 65 THEN '成年人'
        ELSE '老年人'
    END AS age_group
FROM users;

-- 搜索CASE
SELECT 
    product_name,
    price,
    CASE 
        WHEN price < 100 THEN '低价'
        WHEN price BETWEEN 100 AND 500 THEN '中价'
        WHEN price > 500 THEN '高价'
        ELSE '未定价'
    END AS price_range
FROM products;

-- 聚合中使用CASE
SELECT 
    COUNT(CASE WHEN age < 30 THEN 1 END) as young_users,
    COUNT(CASE WHEN age >= 30 THEN 1 END) as mature_users
FROM users;
```

### UNION 联合查询
```sql
-- UNION - 去重联合
SELECT username, email FROM users
UNION
SELECT company_name, contact_email FROM companies;

-- UNION ALL - 不去重联合
SELECT 'user' as type, username as name FROM users
UNION ALL
SELECT 'product' as type, product_name as name FROM products;

-- 复杂UNION示例
SELECT 'January' as month, SUM(price) as total
FROM orders 
WHERE MONTH(order_date) = 1
UNION ALL
SELECT 'February' as month, SUM(price) as total
FROM orders 
WHERE MONTH(order_date) = 2
ORDER BY month;
```

---

## 索引与性能优化

### 创建索引
```sql
-- 单列索引
CREATE INDEX idx_username ON users(username);

-- 复合索引
CREATE INDEX idx_age_status ON users(age, status);

-- 唯一索引
CREATE UNIQUE INDEX uk_email ON users(email);

-- 全文索引（适用于文本搜索）
CREATE FULLTEXT INDEX ft_description ON products(description);

-- 查看索引
SHOW INDEXES FROM users;
```

### 查询优化技巧
```sql
-- 使用EXPLAIN分析查询计划
EXPLAIN SELECT * FROM users WHERE age > 25;

-- 避免SELECT *，只查询需要的列
SELECT username, email FROM users WHERE age > 25;

-- 使用LIMIT限制结果集
SELECT * FROM users ORDER BY created_at DESC LIMIT 10;

-- 使用EXISTS替代IN（大数据集时）
SELECT * FROM users u 
WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);

-- 避免在WHERE子句中使用函数
-- 不好的写法
SELECT * FROM users WHERE YEAR(created_at) = 2023;
-- 好的写法
SELECT * FROM users WHERE created_at >= '2023-01-01' AND created_at < '2024-01-01';
```

---

## 实战练习

### 练习场景：电商数据库

#### 数据准备
```sql
-- 创建示例表
CREATE TABLE categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    parent_id INT DEFAULT NULL
);

CREATE TABLE products (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    category_id INT,
    stock INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE customers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    city VARCHAR(50),
    registration_date DATE
);

CREATE TABLE orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    customer_id INT,
    order_date DATE,
    total_amount DECIMAL(10,2),
    status ENUM('pending', 'processing', 'shipped', 'delivered', 'cancelled'),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE order_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT,
    product_id INT,
    quantity INT,
    unit_price DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

#### 练习题目

**1. 基础查询练习**
```sql
-- 查询所有产品信息，按价格降序排列
SELECT * FROM products ORDER BY price DESC;

-- 查询价格在100-500之间的产品
SELECT name, price FROM products WHERE price BETWEEN 100 AND 500;

-- 查询产品名称包含"手机"的产品
SELECT * FROM products WHERE name LIKE '%手机%';
```

**2. 聚合查询练习**
```sql
-- 统计每个分类的产品数量和平均价格
SELECT 
    c.name AS category_name,
    COUNT(p.id) AS product_count,
    AVG(p.price) AS avg_price
FROM categories c
LEFT JOIN products p ON c.id = p.category_id
GROUP BY c.id, c.name;

-- 查询每月的订单数量和总金额
SELECT 
    DATE_FORMAT(order_date, '%Y-%m') AS month,
    COUNT(*) AS order_count,
    SUM(total_amount) AS total_sales
FROM orders
GROUP BY DATE_FORMAT(order_date, '%Y-%m')
ORDER BY month;
```

**3. 复杂连接查询练习**
```sql
-- 查询每个客户的订单总数和总消费金额
SELECT 
    c.name AS customer_name,
    c.email,
    COUNT(o.id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
GROUP BY c.id, c.name, c.email
ORDER BY total_spent DESC;

-- 查询最畅销的前10个产品
SELECT 
    p.name AS product_name,
    SUM(oi.quantity) AS total_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue
FROM products p
INNER JOIN order_items oi ON p.id = oi.product_id
INNER JOIN orders o ON oi.order_id = o.id
WHERE o.status IN ('shipped', 'delivered')
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 10;
```

**4. 高级查询练习**
```sql
-- 使用窗口函数查询每个分类中价格排名前3的产品
SELECT 
    category_id,
    name,
    price,
    RANK() OVER (PARTITION BY category_id ORDER BY price DESC) as price_rank
FROM products
QUALIFY price_rank <= 3;

-- 查询连续3个月都有购买的客户
WITH monthly_customers AS (
    SELECT 
        customer_id,
        DATE_FORMAT(order_date, '%Y-%m') AS month
    FROM orders
    GROUP BY customer_id, DATE_FORMAT(order_date, '%Y-%m')
),
customer_months AS (
    SELECT 
        customer_id,
        COUNT(DISTINCT month) AS active_months
    FROM monthly_customers
    WHERE month >= DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL 3 MONTH), '%Y-%m')
    GROUP BY customer_id
)
SELECT c.name, c.email
FROM customers c
INNER JOIN customer_months cm ON c.id = cm.customer_id
WHERE cm.active_months = 3;
```

### 学习建议

1. **从基础开始**：先掌握SELECT、INSERT、UPDATE、DELETE基础操作
2. **理解JOIN**：重点理解各种JOIN的区别和使用场景
3. **多练习**：通过实际项目或练习题加深理解
4. **性能意识**：始终考虑查询性能，合理使用索引
5. **学习工具**：熟练使用数据库管理工具（如phpMyAdmin、Navicat等）
6. **阅读文档**：不同数据库（MySQL、PostgreSQL、SQL Server等）有细微差别

---

这份指南涵盖了SQL入门到进阶的主要知识点。建议按顺序学习，每个部分都要多练习，逐步掌握SQL的精髓。记住，SQL是一门实践性很强的语言，只有
