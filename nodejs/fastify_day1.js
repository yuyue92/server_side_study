// 1. 安装 Fastify
// npm init -y
// npm install fastify

// 2. 创建基础服务器 (app.js)
const fastify = require('fastify')({
    logger: true // 启用日志
});

// 基础路由
fastify.get('/', async (request, reply) => {
    return { hello: 'world' };
});

// 带参数的路由
fastify.get('/user/:id', async (request, reply) => {
    const { id } = request.params;
    return { userId: id };
});

// POST 请求
fastify.post('/user', async (request, reply) => {
    const body = request.body;
    return { created: body };
});

// 启动服务器
const start = async () => {
    try {
        await fastify.listen({ port: 3000 });
        console.log('Server listening on port 3000');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();