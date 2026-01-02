import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DatabaseManager {
    constructor() {
        this.db = null;
    }

    connect() {
        // 使用 better-sqlite3（同步库，比异步库性能更好）
        this.db = new Database(join(__dirname, '../../database.sqlite'), {
            verbose: console.log, // 开发环境可以看到 SQL
            // fileMustExist: false
        });

        // 性能优化配置
        this.db.pragma('journal_mode = WAL'); // Write-Ahead Logging，提升并发性能
        this.db.pragma('synchronous = NORMAL'); // 平衡性能和安全
        this.db.pragma('cache_size = -64000'); // 64MB 缓存
        this.db.pragma('temp_store = MEMORY'); // 临时表存储在内存
        this.db.pragma('mmap_size = 30000000000'); // 使用内存映射

        this.initTables();
        this.createIndexes();

        console.log('✅ Database connected with performance optimizations');
        return this.db;
    }

    initTables() {
        // 创建用户表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        age INTEGER,
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // 创建文章表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

        // 创建评论表
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    }

    createIndexes() {
        // 创建索引优化查询性能
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
      CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
    `);
    }

    // 预编译语句（大幅提升性能）
    prepareStatements() {
        return {
            // 用户相关
            insertUser: this.db.prepare(`
        INSERT INTO users (username, email, password, age, role)
        VALUES (@username, @email, @password, @age, @role)
      `),

            getUserById: this.db.prepare(`
        SELECT id, username, email, age, role, status, created_at, updated_at
        FROM users WHERE id = ?
      `),

            getUserByEmail: this.db.prepare(`
        SELECT * FROM users WHERE email = ?
      `),

            getAllUsers: this.db.prepare(`
        SELECT id, username, email, age, role, status, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `),

            updateUser: this.db.prepare(`
        UPDATE users
        SET username = @username, email = @email, age = @age, role = @role, updated_at = CURRENT_TIMESTAMP
        WHERE id = @id
      `),

            deleteUser: this.db.prepare(`DELETE FROM users WHERE id = ?`),

            getUserCount: this.db.prepare(`SELECT COUNT(*) as count FROM users`),

            // 文章相关
            insertPost: this.db.prepare(`
        INSERT INTO posts (user_id, title, content)
        VALUES (@user_id, @title, @content)
      `),

            getPostById: this.db.prepare(`
        SELECT p.*, u.username, u.email
        FROM posts p
        JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
      `),

            getAllPosts: this.db.prepare(`
        SELECT p.*, u.username
        FROM posts p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
      `),

            getPostsByUserId: this.db.prepare(`
        SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC
      `),

            incrementPostViews: this.db.prepare(`
        UPDATE posts SET views = views + 1 WHERE id = ?
      `),

            // 评论相关
            insertComment: this.db.prepare(`
        INSERT INTO comments (post_id, user_id, content)
        VALUES (@post_id, @user_id, @content)
      `),

            getCommentsByPostId: this.db.prepare(`
        SELECT c.*, u.username
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.created_at DESC
      `)
        };
    }

    // 种子数据（用于测试）
    seedData() {
        const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO users (username, email, password, age, role)
      VALUES (?, ?, ?, ?, ?)
    `);

        const insertMany = this.db.transaction((users) => {
            for (const user of users) {
                stmt.run(user);
            }
        });

        insertMany([
            ['admin', 'admin@example.com', 'hashed_password_1', 30, 'admin'],
            ['john_doe', 'john@example.com', 'hashed_password_2', 25, 'user'],
            ['jane_smith', 'jane@example.com', 'hashed_password_3', 28, 'user'],
            ['bob_wilson', 'bob@example.com', 'hashed_password_4', 35, 'user']
        ]);

        console.log('✅ Seed data inserted');
    }

    close() {
        if (this.db) {
            this.db.close();
            console.log('Database connection closed');
        }
    }
}

export default new DatabaseManager();