```
mkdir fastify-demo
cd fastify-demo
npm init -y
# 安装 fastify 框架
npm install fastify
# 安装 autocannon (压力测试工具)
npm install autocannon
npm install express
```

```
// fastifyserver.js
const fastify = require('fastify')({
  logger: false // 生产环境通常开启，但压测时关闭以测试极限吞吐量
});

// 定义一个最简单的路由
fastify.get('/', async (request, reply) => {
  return { hello: 'world', framework: 'Fastify' };
});

// 启动服务器
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log('🚀 Fastify 服务器已启动: http://localhost:3000');
    console.log('🔥 准备好运行压测命令了吗？');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

终端 A：运行服务器：
- node server.js

终端 B：运行压测工具 autocannon 我们将模拟 100 个并发连接，持续轰炸 5 秒钟。
- npx autocannon -c 100 -d 5 http://localhost:3000

以下是expressserver.js可以拿来对比运行一下，比较两者性能与速度差异
```
// express-server.js (需先 npm install express)
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ hello: 'world', framework: 'Express' });
});

app.listen(3000, () => console.log('Express running'));
```
