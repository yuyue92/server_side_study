下面是一份新手友好但覆盖面很广的SQL示例集合；使用了一套常见的电商模型当作示例；

基本涵盖了 `union / all / order by /  group by /having / exists / not exists /  update /delete / upsert / 子查询等等`

示例用到的表：
- customers(id, name, city, created_at)
- orders(id, customer_id, order_date, status)
- order_items(id, order_id, product_id, quantity, unit_price)
- products(id, name, category)
- payments(id, order_id, amount, paid_at, method)

**1) UNION vs UNION ALL（合并结果集）**
目标：把“已支付订单ID”和“已发货订单ID”合并成一个列表。
```
-- 去重合并（慢一点，适合确实需要去重）
SELECT id FROM orders WHERE status = 'PAID'
UNION
SELECT id FROM orders WHERE status = 'SHIPPED';

-- 不去重（更快，常用）
SELECT id FROM orders WHERE status = 'PAID'
UNION ALL
SELECT id FROM orders WHERE status = 'SHIPPED';
```

**2) 排序与分页（ORDER BY / LIMIT-OFFSET / FETCH）**
目标：按下单时间倒序取最近 20 单。
```
-- MySQL / Postgres
SELECT id, customer_id, order_date
FROM orders
ORDER BY order_date DESC
LIMIT 20 OFFSET 0;      -- 第 1 页

-- 标准写法（Oracle/DB2/Postgres 也支持）
SELECT id, customer_id, order_date
FROM orders
ORDER BY order_date DESC
FETCH FIRST 20 ROWS ONLY;

```
