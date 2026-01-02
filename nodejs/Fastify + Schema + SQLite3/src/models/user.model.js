import dbManager from '../config/database.js';

export class UserModel {
    constructor() {
        this.db = dbManager.db;
        this.statements = dbManager.prepareStatements();
    }

    // 创建用户
    create(userData) {
        try {
            const info = this.statements.insertUser.run(userData);
            return { id: info.lastInsertRowid, ...userData };
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                throw new Error('Username or email already exists');
            }
            throw error;
        }
    }

    // 根据 ID 获取用户
    findById(id) {
        return this.statements.getUserById.get(id);
    }

    // 根据 Email 获取用户
    findByEmail(email) {
        return this.statements.getUserByEmail.get(email);
    }

    // 获取所有用户（分页）
    findAll(page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const users = this.statements.getAllUsers.all(limit, offset);
        const { count } = this.statements.getUserCount.get();

        return {
            users,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        };
    }

    // 更新用户
    update(id, userData) {
        const user = this.findById(id);
        if (!user) return null;

        const updatedData = {
            id,
            username: userData.username ?? user.username,
            email: userData.email ?? user.email,
            age: userData.age ?? user.age,
            role: userData.role ?? user.role
        };

        this.statements.updateUser.run(updatedData);
        return this.findById(id);
    }

    // 删除用户
    delete(id) {
        const info = this.statements.deleteUser.run(id);
        return info.changes > 0;
    }

    // 批量插入（使用事务优化性能）
    createMany(users) {
        const insertMany = this.db.transaction((userList) => {
            const results = [];
            for (const userData of userList) {
                const info = this.statements.insertUser.run(userData);
                results.push({ id: info.lastInsertRowid, ...userData });
            }
            return results;
        });

        return insertMany(users);
    }
}
