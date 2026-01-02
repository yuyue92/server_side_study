import { UserModel } from '../models/user.model.js';

export class UserController {
    constructor() {
        this.userModel = new UserModel();
    }

    // 获取所有用户
    async getUsers(request, reply) {
        try {
            const { page = 1, limit = 10 } = request.query;
            const result = this.userModel.findAll(page, limit);

            return {
                success: true,
                data: result
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: 'InternalServerError',
                message: error.message
            };
        }
    }

    // 获取单个用户
    async getUser(request, reply) {
        try {
            const { id } = request.params;
            const user = this.userModel.findById(id);

            if (!user) {
                reply.code(404);
                return {
                    success: false,
                    error: 'NotFound',
                    message: 'User not found'
                };
            }

            return {
                success: true,
                data: user
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: 'InternalServerError',
                message: error.message
            };
        }
    }

    // 创建用户
    async createUser(request, reply) {
        try {
            const userData = request.body;

            // 简单的密码哈希（生产环境应使用 bcrypt）
            userData.password = `hashed_${userData.password}`;

            const user = this.userModel.create(userData);

            reply.code(201);
            return {
                success: true,
                data: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                message: 'User created successfully'
            };
        } catch (error) {
            reply.code(400);
            return {
                success: false,
                error: 'BadRequest',
                message: error.message
            };
        }
    }

    // 更新用户
    async updateUser(request, reply) {
        try {
            const { id } = request.params;
            const userData = request.body;

            const user = this.userModel.update(id, userData);

            if (!user) {
                reply.code(404);
                return {
                    success: false,
                    error: 'NotFound',
                    message: 'User not found'
                };
            }

            return {
                success: true,
                data: user,
                message: 'User updated successfully'
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: 'InternalServerError',
                message: error.message
            };
        }
    }

    // 删除用户
    async deleteUser(request, reply) {
        try {
            const { id } = request.params;
            const deleted = this.userModel.delete(id);

            if (!deleted) {
                reply.code(404);
                return {
                    success: false,
                    error: 'NotFound',
                    message: 'User not found'
                };
            }

            return {
                success: true,
                message: 'User deleted successfully'
            };
        } catch (error) {
            reply.code(500);
            return {
                success: false,
                error: 'InternalServerError',
                message: error.message
            };
        }
    }
}
