export const userSchemas = {
    // 共享的用户对象 Schema
    user: {
        $id: 'user',
        type: 'object',
        properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string', format: 'email' },
            age: { type: ['integer', 'null'] },
            role: { type: 'string', enum: ['admin', 'user', 'guest'] },
            status: { type: 'string', enum: ['active', 'inactive', 'banned'] },
            created_at: { type: 'string' },
            updated_at: { type: 'string' }
        }
    },

    // 获取用户列表
    getUsers: {
        querystring: {
            type: 'object',
            properties: {
                page: { type: 'integer', minimum: 1, default: 1 },
                limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
                role: { type: 'string', enum: ['admin', 'user', 'guest'] }
            }
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            users: {
                                type: 'array',
                                items: { $ref: 'user#' }
                            },
                            pagination: {
                                type: 'object',
                                properties: {
                                    page: { type: 'integer' },
                                    limit: { type: 'integer' },
                                    total: { type: 'integer' },
                                    totalPages: { type: 'integer' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },

    // 获取单个用户
    getUser: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'integer' }
            },
            required: ['id']
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: { $ref: 'user#' }
                }
            },
            404: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    },

    // 创建用户
    createUser: {
        body: {
            type: 'object',
            required: ['username', 'email', 'password'],
            properties: {
                username: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 20,
                    pattern: '^[a-zA-Z0-9_]+$'
                },
                email: { type: 'string', format: 'email' },
                password: { type: 'string', minLength: 6 },
                age: { type: 'integer', minimum: 0, maximum: 150 },
                role: { type: 'string', enum: ['admin', 'user', 'guest'], default: 'user' }
            },
            additionalProperties: false
        },
        response: {
            201: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            id: { type: 'integer' },
                            username: { type: 'string' },
                            email: { type: 'string' }
                        }
                    },
                    message: { type: 'string' }
                }
            },
            400: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    error: { type: 'string' },
                    message: { type: 'string' }
                }
            }
        }
    },

    // 更新用户
    updateUser: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'integer' }
            },
            required: ['id']
        },
        body: {
            type: 'object',
            properties: {
                username: { type: 'string', minLength: 3, maxLength: 20 },
                email: { type: 'string', format: 'email' },
                age: { type: 'integer', minimum: 0, maximum: 150 },
                role: { type: 'string', enum: ['admin', 'user', 'guest'] }
            },
            minProperties: 1
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: { $ref: 'user#' },
                    message: { type: 'string' }
                }
            }
        }
    },

    // 删除用户
    deleteUser: {
        params: {
            type: 'object',
            properties: {
                id: { type: 'integer' }
            },
            required: ['id']
        },
        response: {
            200: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' }
                }
            }
        }
    }
};