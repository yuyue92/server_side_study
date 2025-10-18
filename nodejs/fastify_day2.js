const fastify = require('fastify')({ logger: true });

// 1. 路由方法
fastify.route({
    method: 'GET',
    url: '/route-config',
    handler: async (request, reply) => {
        return { method: 'route config' };
    }
});

// 2. 多方法路由
fastify.route({
    method: ['GET', 'POST'],
    url: '/multi-method',
    handler: async (request, reply) => {
        return { method: request.method };
    }
});

// 3. 路由参数、查询参数、请求体
fastify.get('/search/:category', async (request, reply) => {
    const { category } = request.params;      // 路径参数
    const { keyword } = request.query;        // 查询参数
    const headers = request.headers;          // 请求头

    return {
        category,
        keyword,
        userAgent: headers['user-agent']
    };
});

// 4. 自定义响应
fastify.get('/custom-response', async (request, reply) => {
    reply
        .code(201)
        .header('X-Custom-Header', 'value')
        .send({ status: 'created' });
});

// 5. 路由前缀（组织路由）
fastify.register(async (instance) => {
    instance.get('/list', async () => ({ api: 'list' }));
    instance.get('/detail', async () => ({ api: 'detail' }));
}, { prefix: '/api/v1' });

fastify.listen({ port: 3000 });