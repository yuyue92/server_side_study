import { UserController } from '../controllers/user.controller.js';
import { userSchemas } from '../schemas/user.schema.js';

export default async function userRoutes(fastify, options) {
    const controller = new UserController();

    // 获取所有用户
    fastify.get('/users', {
        schema: userSchemas.getUsers
    }, (req, reply) => controller.getUsers(req, reply));

    // 获取单个用户
    fastify.get('/users/:id', {
        schema: userSchemas.getUser
    }, (req, reply) => controller.getUser(req, reply));

    // 创建用户
    fastify.post('/users', {
        schema: userSchemas.createUser
    }, (req, reply) => controller.createUser(req, reply));

    // 更新用户
    fastify.put('/users/:id', {
        schema: userSchemas.updateUser
    }, (req, reply) => controller.updateUser(req, reply));

    // 删除用户
    fastify.delete('/users/:id', {
        schema: userSchemas.deleteUser
    }, (req, reply) => controller.deleteUser(req, reply));

    // 批量创建用户（演示事务）
    fastify.post('/users/batch', {
        schema: {
            body: {
                type: 'object',
                properties: {
                    users: {
                        type: 'array',
                        items: {
                            type: 'object',
                            required: ['username', 'email', 'password'],
                            properties: {
                                username: { type: 'string' },
                                email: { type: 'string' },
                                password: { type: 'string' },
                                age: { type: 'integer' },
                                role: { type: 'string' }
                            }
                        }
                    }
                }
            },
            response: {
                201: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean' },
                        message: { type: 'string' },
                        count: { type: 'integer' }
                    }
                }
            }
        }
    }, async (request, reply) => {
        const controller = new UserController();
        const { users } = request.body;

        const results = controller.userModel.createMany(users);

        reply.code(201);
        return {
            success: true,
            message: 'Users created successfully',
            count: results.length
        };
    });
}