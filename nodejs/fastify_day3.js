const fastify = require('fastify')({ logger: true });

// 1. 基础 Schema 验证
const userSchema = {
    body: {
        type: 'object',
        required: ['username', 'email'],
        properties: {
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
            age: { type: 'integer', minimum: 0, maximum: 120 }
        }
    },
    response: {
        201: {
            type: 'object',
            properties: {
                id: { type: 'integer' },
                username: { type: 'string' },
                email: { type: 'string' }
            }
        }
    }
};

fastify.post('/user', { schema: userSchema }, async (request, reply) => {
    const user = request.body;
    // 验证通过后的逻辑
    reply.code(201);
    return {
        id: 1,
        username: user.username,
        email: user.email
    };
});

// 2. 查询参数验证
const searchSchema = {
    querystring: {
        type: 'object',
        properties: {
            keyword: { type: 'string' },
            page: { type: 'integer', default: 1 },
            limit: { type: 'integer', default: 10, maximum: 100 }
        }
    }
};

fastify.get('/search', { schema: searchSchema }, async (request) => {
    const { keyword, page, limit } = request.query;
    return { keyword, page, limit };
});

// 3. 路径参数验证
const userDetailSchema = {
    params: {
        type: 'object',
        properties: {
            id: { type: 'integer' }
        }
    }
};

fastify.get('/user/:id', { schema: userDetailSchema }, async (request) => {
    return { userId: request.params.id };
});

// 4. 复用 Schema
const definitions = {
    user: {
        type: 'object',
        properties: {
            id: { type: 'integer' },
            username: { type: 'string' }
        }
    }
};

fastify.addSchema({
    $id: 'userSchema',
    ...definitions.user
});

const userListSchema = {
    response: {
        200: {
            type: 'array',
            items: { $ref: 'userSchema#' }
        }
    }
};

fastify.get('/users', { schema: userListSchema }, async () => {
    return [
        { id: 1, username: 'alice' },
        { id: 2, username: 'bob' }
    ];
});

fastify.listen({ port: 3000 });