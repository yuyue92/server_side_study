import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dbManager from './config/database.js';
import userRoutes from './routes/user.routes.js';
import { userSchemas } from './schemas/user.schema.js';

// 创建 Fastify 实例
/* const fastify = Fastify({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname'
            }
        }
    },
    // 性能优化配置
    ignoreTrailingSlash: true,
    caseSensitive: true,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    maxParamLength: 100
}); */
// 找到这一段：
const fastify = Fastify({
    logger: true,  // 改成这样最简单
    ignoreTrailingSlash: true,
    caseSensitive: true,
    requestIdLogLabel: 'reqId',
    disableRequestLogging: false,
    maxParamLength: 100
});
// 注册插件
await fastify.register(cors, {
    origin: true
});

await fastify.register(helmet, {
    contentSecurityPolicy: false
});

// Swagger 文档
await fastify.register(swagger, {
    swagger: {
        info: {
            title: 'Fastify SQLite API',
            description: 'High-performance API with Fastify and SQLite',
            version: '1.0.0'
        },
        host: 'localhost:3000',
        schemes: ['http'],
        consumes: ['application/json'],
        produces: ['application/json']
    }
});

await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
        docExpansion: 'list',
        deepLinking: false
    }
});

// 初始化数据库
dbManager.connect();
dbManager.seedData();

// 注册共享 Schema
fastify.addSchema(userSchemas.user);

// 注册路由
await fastify.register(userRoutes, { prefix: '/api' });

// 健康检查
fastify.get('/health', {
    schema: {
        response: {
            200: {
                type: 'object',
                properties: {
                    status: { type: 'string' },
                    timestamp: { type: 'string' },
                    uptime: { type: 'number' }
                }
            }
        }
    }
}, async (request, reply) => {
    return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    };
});

// 性能测试端点
fastify.get('/api/benchmark', {
    schema: {
        querystring: {
            type: 'object',
            properties: {
                count: { type: 'integer', minimum: 1, maximum: 10000, default: 100 }
            }
        }
    }
}, async (request, reply) => {
    const { count } = request.query;
    const users = [];

    for (let i = 0; i < count; i++) {
        users.push({
            id: i,
            username: `user_${i}`,
            email: `user${i}@example.com`,
            age: 20 + (i % 50),
            role: 'user'
        });
    }

    return {
        success: true,
        count,
        data: users
    };
});

// 错误处理
fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);

    if (error.validation) {
        reply.status(400).send({
            success: false,
            error: 'ValidationError',
            message: error.message,
            details: error.validation
        });
    } else {
        reply.status(error.statusCode || 500).send({
            success: false,
            error: error.name || 'InternalServerError',
            message: error.message
        });
    }
});

// 优雅关闭
const closeGracefully = async (signal) => {
    console.log(`\n⚠️  Received signal to terminate: ${signal}`);

    await fastify.close();
    dbManager.close();

    process.exit(0);
};

process.on('SIGINT', closeGracefully);
process.on('SIGTERM', closeGracefully);

// 启动服务器
try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log(`
🚀 Server is running!
📝 API Documentation: http://localhost:3000/docs
💚 Health Check: http://localhost:3000/health
⚡ Benchmark: http://localhost:3000/api/benchmark?count=1000
  `);
} catch (err) {
    fastify.log.error(err);
    process.exit(1);
}