import Fastify from 'fastify';
import sensible from 'fastify-sensible';
import sqlite3 from 'sqlite3';
import { promisify } from 'node:util';
import fs from 'fs';

const app = Fastify({ logger: true });
await app.register(sensible);

// ---------- SQLite 初始化 ----------
const DB_FILE = 'data.db';
const exists = fs.existsSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);
const run = promisify(db.run.bind(db));
const all = promisify(db.all.bind(db));
const get = promisify(db.get.bind(db));

// 开启外键
await run('PRAGMA foreign_keys = ON');

// 首次建表
if (!exists) app.log.info('Initialize DB schema...');
await run(`
CREATE TABLE IF NOT EXISTS warehouses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  address TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  unit TEXT DEFAULT 'pcs',
  price NUMERIC,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  deleted_at TEXT
);
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  warehouse_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (warehouse_id, product_id),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('IN','OUT','TRANSFER','ADJUST')),
  warehouse_id INTEGER NOT NULL,
  warehouse_to_id INTEGER, -- TRANSFER 目标仓
  product_id INTEGER NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  reason TEXT,
  ref_no TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
  FOREIGN KEY (warehouse_to_id) REFERENCES warehouses(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
CREATE INDEX IF NOT EXISTS idx_wh ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_prod ON products(sku);
CREATE INDEX IF NOT EXISTS idx_inv ON inventory(warehouse_id, product_id);
CREATE INDEX IF NOT EXISTS idx_mov ON stock_movements(product_id, warehouse_id, created_at);
`);

// ---------- 小工具 ----------
async function tx(fn) {
    await run('BEGIN');
    try {
        const res = await fn();
        await run('COMMIT');
        return res;
    } catch (e) {
        await run('ROLLBACK');
        throw e;
    }
}

async function upsertInventory(warehouse_id, product_id, delta) {
    // 确保存在记录
    await run(
        `INSERT INTO inventory (warehouse_id, product_id, qty)
     VALUES (?, ?, 0)
     ON CONFLICT(warehouse_id, product_id) DO NOTHING`,
        [warehouse_id, product_id]
    );
    // 更新数量
    await run(
        `UPDATE inventory SET qty = qty + ?, updated_at=datetime('now')
     WHERE warehouse_id=? AND product_id=?`,
        [delta, warehouse_id, product_id]
    );
    // 不允许负数
    const row = await get(
        `SELECT qty FROM inventory WHERE warehouse_id=? AND product_id=?`,
        [warehouse_id, product_id]
    );
    if (row.qty < 0) {
        throw app.httpErrors.badRequest('Insufficient stock');
    }
    return row.qty;
}

// ---------- 通用 schema ----------
const pagerQuery = {
    type: 'object',
    properties: {
        q: { type: 'string', default: '' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'integer', minimum: 0, default: 0 },
        includeDeleted: { type: 'boolean', default: false }
    }
};

// ---------- 基础：健康检查 ----------
app.get('/health', async () => ({ ok: true }));

// ---------- 仓库 CRUD ----------
const whBody = {
    type: 'object',
    required: ['name', 'code'],
    additionalProperties: false,
    properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        code: { type: 'string', minLength: 1, maxLength: 50 },
        address: { type: 'string', maxLength: 255, nullable: true }
    }
};
const whPatch = { ...whBody, required: [], minProperties: 1 };

app.post('/warehouses', { schema: { body: whBody } }, async (req, reply) => {
    const { name, code, address = null } = req.body;
    try {
        await run(
            `INSERT INTO warehouses (name, code, address) VALUES (?, ?, ?)`,
            [name.trim(), code.trim(), address]
        );
        const row = await get(`SELECT * FROM warehouses WHERE code=?`, [code.trim()]);
        reply.header('Location', `/warehouses/${row.id}`).code(201).send(row);
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) return reply.badRequest('Warehouse code exists');
        throw e;
    }
});

app.get('/warehouses', { schema: { querystring: pagerQuery } }, async (req) => {
    const { q = '', limit = 20, offset = 0, includeDeleted = false } = req.query;
    const where = [];
    const params = [];
    if (!includeDeleted) where.push('deleted_at IS NULL');
    if (q) { where.push('(name LIKE ? OR code LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const items = await all(
        `SELECT * FROM warehouses ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const { total } = await get(
        `SELECT COUNT(*) AS total FROM warehouses ${whereSql}`,
        params
    );
    return { total, limit, offset, items };
});

app.get('/warehouses/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer', minimum: 1 } }, required: ['id'] },
        querystring: { type: 'object', properties: { includeDeleted: { type: 'boolean', default: false } } }
    }
}, async (req, reply) => {
    const { id } = req.params;
    const { includeDeleted = false } = req.query;
    const row = await get(
        `SELECT * FROM warehouses WHERE id=? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
        [id]
    );
    if (!row) return reply.notFound('Warehouse not found');
    return row;
});

app.put('/warehouses/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }, body: whBody }
}, async (req, reply) => {
    const { id } = req.params;
    const { name, code, address = null } = req.body;
    try {
        const info = await run(
            `UPDATE warehouses SET name=?, code=?, address=?, updated_at=datetime('now')
       WHERE id=? AND deleted_at IS NULL`,
            [name.trim(), code.trim(), address, id]
        );
        if (info.changes === 0) return reply.notFound('Warehouse not found or deleted');
        return await get(`SELECT * FROM warehouses WHERE id=?`, [id]);
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) return reply.badRequest('Warehouse code exists');
        throw e;
    }
});

app.patch('/warehouses/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }, body: whPatch }
}, async (req, reply) => {
    const { id } = req.params;
    const current = await get(`SELECT * FROM warehouses WHERE id=? AND deleted_at IS NULL`, [id]);
    if (!current) return reply.notFound('Warehouse not found or deleted');
    const next = {
        name: req.body.name ?? current.name,
        code: req.body.code ?? current.code,
        address: req.body.address ?? current.address
    };
    try {
        await run(
            `UPDATE warehouses SET name=?, code=?, address=?, updated_at=datetime('now') WHERE id=? AND deleted_at IS NULL`,
            [next.name, next.code, next.address, id]
        );
        return await get(`SELECT * FROM warehouses WHERE id=?`, [id]);
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) return reply.badRequest('Warehouse code exists');
        throw e;
    }
});

app.delete('/warehouses/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        querystring: { type: 'object', properties: { hard: { type: 'boolean', default: false } } }
    }
}, async (req, reply) => {
    const { id } = req.params, { hard = false } = req.query;
    if (hard) {
        await run(`DELETE FROM warehouses WHERE id=?`, [id]);
        return reply.code(204).send();
    } else {
        const info = await run(`UPDATE warehouses SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL`, [id]);
        if (info.changes === 0) return reply.notFound('Warehouse not found or already deleted');
        return reply.code(204).send();
    }
});

// ---------- 产品 CRUD ----------
const prodBody = {
    type: 'object',
    required: ['sku', 'name'],
    additionalProperties: false,
    properties: {
        sku: { type: 'string', minLength: 1, maxLength: 100 },
        name: { type: 'string', minLength: 1, maxLength: 200 },
        unit: { type: 'string', default: 'pcs', maxLength: 20 },
        price: { oneOf: [{ type: 'number', minimum: 0 }, { type: 'null' }] }
    }
};
const prodPatch = { ...prodBody, required: [], minProperties: 1 };

app.post('/products', { schema: { body: prodBody } }, async (req, reply) => {
    const { sku, name, unit = 'pcs', price = null } = req.body;
    try {
        await run(`INSERT INTO products (sku, name, unit, price) VALUES (?, ?, ?, ?)`, [sku.trim(), name.trim(), unit, price]);
        const row = await get(`SELECT * FROM products WHERE sku=?`, [sku.trim()]);
        reply.header('Location', `/products/${row.id}`).code(201).send(row);
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) return reply.badRequest('SKU exists');
        throw e;
    }
});

app.get('/products', { schema: { querystring: pagerQuery } }, async (req) => {
    const { q = '', limit = 20, offset = 0, includeDeleted = false } = req.query;
    const where = [], params = [];
    if (!includeDeleted) where.push('deleted_at IS NULL');
    if (q) { where.push('(name LIKE ? OR sku LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const items = await all(
        `SELECT * FROM products ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const { total } = await get(`SELECT COUNT(*) AS total FROM products ${whereSql}`, params);
    return { total, limit, offset, items };
});

app.get('/products/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        querystring: { type: 'object', properties: { includeDeleted: { type: 'boolean', default: false } } }
    }
}, async (req, reply) => {
    const { id } = req.params, { includeDeleted = false } = req.query;
    const row = await get(
        `SELECT * FROM products WHERE id=? ${includeDeleted ? '' : 'AND deleted_at IS NULL'}`,
        [id]
    );
    if (!row) return reply.notFound('Product not found');
    return row;
});

app.put('/products/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }, body: prodBody }
}, async (req, reply) => {
    const { id } = req.params;
    const { sku, name, unit = 'pcs', price = null } = req.body;
    try {
        const info = await run(
            `UPDATE products SET sku=?, name=?, unit=?, price=?, updated_at=datetime('now')
       WHERE id=? AND deleted_at IS NULL`,
            [sku.trim(), name.trim(), unit, price, id]
        );
        if (info.changes === 0) return reply.notFound('Product not found or deleted');
        return await get(`SELECT * FROM products WHERE id=?`, [id]);
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) return reply.badRequest('SKU exists');
        throw e;
    }
});

app.patch('/products/:id', {
    schema: { params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] }, body: prodPatch }
}, async (req, reply) => {
    const { id } = req.params;
    const current = await get(`SELECT * FROM products WHERE id=? AND deleted_at IS NULL`, [id]);
    if (!current) return reply.notFound('Product not found or deleted');
    const next = {
        sku: req.body.sku ?? current.sku,
        name: req.body.name ?? current.name,
        unit: req.body.unit ?? current.unit,
        price: req.body.price ?? current.price
    };
    try {
        await run(
            `UPDATE products SET sku=?, name=?, unit=?, price=?, updated_at=datetime('now')
       WHERE id=? AND deleted_at IS NULL`,
            [next.sku, next.name, next.unit, next.price, id]
        );
        return await get(`SELECT * FROM products WHERE id=?`, [id]);
    } catch (e) {
        if (String(e.message).includes('UNIQUE')) return reply.badRequest('SKU exists');
        throw e;
    }
});

app.delete('/products/:id', {
    schema: {
        params: { type: 'object', properties: { id: { type: 'integer' } }, required: ['id'] },
        querystring: { type: 'object', properties: { hard: { type: 'boolean', default: false } } }
    }
}, async (req, reply) => {
    const { id } = req.params, { hard = false } = req.query;
    if (hard) {
        await run(`DELETE FROM products WHERE id=?`, [id]);
        return reply.code(204).send();
    } else {
        const info = await run(`UPDATE products SET deleted_at=datetime('now') WHERE id=? AND deleted_at IS NULL`, [id]);
        if (info.changes === 0) return reply.notFound('Product not found or already deleted');
        return reply.code(204).send();
    }
});

// ---------- 库存查询 ----------
app.get('/inventory', {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                warehouseId: { type: 'integer' },
                productId: { type: 'integer' },
                q: { type: 'string', default: '' }, // 模糊查 sku/name
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                offset: { type: 'integer', minimum: 0, default: 0 }
            }
        }
    }
}, async (req) => {
    const { warehouseId, productId, q = '', limit = 20, offset = 0 } = req.query;
    const where = ['w.deleted_at IS NULL', 'p.deleted_at IS NULL'];
    const params = [];
    if (warehouseId) { where.push('i.warehouse_id=?'); params.push(warehouseId); }
    if (productId) { where.push('i.product_id=?'); params.push(productId); }
    if (q) { where.push('(p.sku LIKE ? OR p.name LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const items = await all(
        `SELECT i.warehouse_id, w.name AS warehouse_name, i.product_id, p.sku, p.name AS product_name,
            p.unit, i.qty, i.updated_at
     FROM inventory i
     JOIN warehouses w ON w.id = i.warehouse_id
     JOIN products p   ON p.id = i.product_id
     ${whereSql}
     ORDER BY i.warehouse_id, i.product_id
     LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const { total } = await get(
        `SELECT COUNT(*) AS total
     FROM inventory i
     JOIN warehouses w ON w.id = i.warehouse_id
     JOIN products p   ON p.id = i.product_id
     ${whereSql}`, params
    );
    return { total, limit, offset, items };
});

app.get('/inventory/:warehouseId/:productId', {
    schema: {
        params: {
            type: 'object', properties: {
                warehouseId: { type: 'integer', minimum: 1 },
                productId: { type: 'integer', minimum: 1 }
            }, required: ['warehouseId', 'productId']
        }
    }
}, async (req, reply) => {
    const { warehouseId, productId } = req.params;
    const row = await get(
        `SELECT qty FROM inventory WHERE warehouse_id=? AND product_id=?`,
        [warehouseId, productId]
    );
    return { warehouseId, productId, qty: row?.qty ?? 0 };
});

// ---------- 出入库/调拨/调整 ----------
const moveBody = {
    type: 'object',
    required: ['movement_type', 'warehouse_id', 'product_id', 'qty'],
    additionalProperties: false,
    properties: {
        movement_type: { type: 'string', enum: ['IN', 'OUT', 'TRANSFER', 'ADJUST'] },
        warehouse_id: { type: 'integer', minimum: 1 },
        warehouse_to_id: { oneOf: [{ type: 'integer', minimum: 1 }, { type: 'null' }] },
        product_id: { type: 'integer', minimum: 1 },
        qty: { type: 'integer', minimum: 1 },
        reason: { type: 'string', maxLength: 255, nullable: true },
        ref_no: { type: 'string', maxLength: 100, nullable: true }
    }
};

app.post('/stock-movements', { schema: { body: moveBody } }, async (req, reply) => {
    const { movement_type, warehouse_id, warehouse_to_id = null, product_id, qty, reason = null, ref_no = null } = req.body;

    // 基础校验
    if (movement_type === 'TRANSFER' && !warehouse_to_id) {
        return reply.badRequest('warehouse_to_id required for TRANSFER');
    }
    if (movement_type !== 'TRANSFER' && warehouse_to_id) {
        return reply.badRequest('warehouse_to_id only for TRANSFER');
    }
    if (movement_type === 'TRANSFER' && warehouse_to_id === warehouse_id) {
        return reply.badRequest('Cannot transfer to the same warehouse');
    }

    const res = await tx(async () => {
        // 插入 movement 记录
        await run(
            `INSERT INTO stock_movements (movement_type, warehouse_id, warehouse_to_id, product_id, qty, reason, ref_no)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [movement_type, warehouse_id, warehouse_to_id, product_id, qty, reason, ref_no]
        );

        // 更新库存
        if (movement_type === 'IN') {
            await upsertInventory(warehouse_id, product_id, +qty);
        } else if (movement_type === 'OUT') {
            await upsertInventory(warehouse_id, product_id, -qty);
        } else if (movement_type === 'TRANSFER') {
            await upsertInventory(warehouse_id, product_id, -qty);
            await upsertInventory(warehouse_to_id, product_id, +qty);
        } else if (movement_type === 'ADJUST') {
            // 调整：正数为盘盈（增加），负数请传 OUT 或 ADJUST+负？这里定义：qty>0，reason 写明增减
            // 为了接口简单，ADJUST 约定：正数为调整量（可能增加或减少），通过 reason 描述方向；
            // 这里采用“qty 为正数 + reason 判别”过于主观，改为：ADJUST 一律按增加/减少需在 reason 说明，
            // 实际库存变化按增加处理：如需减少，请使用 OUT 或 ADJUST 负数（但我们 schema 限制了最小 1）。
            // ——为保持清晰，这里将 ADJUST 实现为“只增不减”；减少请用 OUT。
            await upsertInventory(warehouse_id, product_id, +qty);
        }

        const afterSrc = await get(
            `SELECT qty FROM inventory WHERE warehouse_id=? AND product_id=?`,
            [warehouse_id, product_id]
        );
        const afterDst = movement_type === 'TRANSFER'
            ? await get(`SELECT qty FROM inventory WHERE warehouse_id=? AND product_id=?`, [warehouse_to_id, product_id])
            : null;

        return { afterSrc: afterSrc?.qty ?? 0, afterDst: afterDst?.qty ?? undefined };
    });

    return {
        movement_type,
        warehouse_id,
        warehouse_to_id: warehouse_to_id ?? undefined,
        product_id,
        qty,
        reason,
        ref_no,
        after_qty_src: res.afterSrc,
        after_qty_dst: res.afterDst
    };
});

// movement 列表
app.get('/stock-movements', {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                warehouseId: { type: 'integer' },
                productId: { type: 'integer' },
                type: { type: 'string', enum: ['IN', 'OUT', 'TRANSFER', 'ADJUST'] },
                ref: { type: 'string' },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
                offset: { type: 'integer', minimum: 0, default: 0 }
            }
        }
    }
}, async (req) => {
    const { warehouseId, productId, type, ref, limit = 20, offset = 0 } = req.query;
    const where = [], params = [];
    if (warehouseId) { where.push('warehouse_id=?'); params.push(warehouseId); }
    if (productId) { where.push('product_id=?'); params.push(productId); }
    if (type) { where.push('movement_type=?'); params.push(type); }
    if (ref) { where.push('ref_no LIKE ?'); params.push(`%${ref}%`); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const items = await all(
        `SELECT * FROM stock_movements ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
    );
    const { total } = await get(
        `SELECT COUNT(*) AS total FROM stock_movements ${whereSql}`,
        params
    );
    return { total, limit, offset, items };
});

// ---------- 启动 ----------
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen({ port: PORT, host: HOST })
    .catch(err => { app.log.error(err); process.exit(1); });
