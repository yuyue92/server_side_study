const fastify = require('fastify')({
    logger: true // 使用简单的日志输出
});

// 内存数据库 - 模拟用户表
let userlist = [
    { id: 1, name: '张三', age: 25, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    { id: 2, name: '李四', age: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
];

// ==================== 路由定义 ====================

// 健康检查
fastify.get('/', async (request, reply) => {
    return {
        service: '用户管理服务',
        version: '1.0.0',
        status: '运行中',
        totalUsers: userlist.length
    };
});
// 2. 获取所有用户 - GET /userlist
fastify.get("/users", async (request, reply) => {
    try {
        const { page = 1, pageSize = 10, name } = request.query;
        console.log("request: ", page, pageSize, name)
        return {
            status: '获取用户列表成功',
            data: userlist
        }
    } catch (error) {
        reply.code(500)
        return { status: '服务器内部错误' }
    }
})
// 3. 获取单个用户
fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params;
    const cuser = userlist.find(v => v.id === parseInt(id))
    console.log("uid: ", id, "cuuer: ", cuser)
    if (!cuser) {
        reply.code(404)
        return { status: `用户 ID ${id} 不存在` }
    }
    return {
        status: '获取用户信息成功',
        data: cuser
    }
})
// 1. 创建用户
fastify.post("/users", async (request, reply) => {
    try {
        const { name, age } = request.body;
        // 检查用户名是否已存在
        const existUser = userlist.find(user => user.name === name)
        console.log('postttttt: ', { name, age, existUser })
        if (existUser) {
            return { status: `用户名 "${name}" 已存在` }
        }
        const newuser = {
            id: userlist.length + 1,
            name,
            age,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        }
        userlist.push(newuser)
        reply.code(201)
        return { status: '用户创建成功' }
    } catch (error) {
        reply.code(500)
        return { status: '服务器内部错误' }
    }
})



// 启动服务器
const start = async () => {
    try {
        await fastify.listen({
            port: 3000,
            host: '0.0.0.0'
        })
        console.log('🚀 用户管理服务已启动!');
        console.log('📍 服务地址: http://localhost:3000');
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

// 启动应用
start();

//测试命令行
/**
 * 
 * curl http://localhost:3000/
curl http://localhost:3000/users
curl http://localhost:3000/users/1
curl -X POST http://localhost:3000/users -H "Content-Type: application/json" -d "{\"name\": \"王五\", \"age\": 28}"
 */