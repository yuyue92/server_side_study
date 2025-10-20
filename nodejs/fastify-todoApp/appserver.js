const fastify = require('fastify')({
    logger: { level: 'info' }
})
const Database = require('better-sqlite3')
const path = require('path')

//数据库初始化
const dbPath = path.join(__dirname, 'todos.db')
const db = new Database(dbPath)

//创建表
function initDatabase() {
    const createTableSQL = `
        create table if not exists todos (
            id integer primary key autoincrement,
            title text not null,
            description text,
            completed boolean default false,
            created_at datetime default current_timestamp,
            updated_at datetime default current_timestamp
        )
    `;
    db.exec(createTableSQL);
    console.log("======database initialized!!!=====")
}

//Todo数据操作类
class Todo {
    static findAll() {
        const sql = 'select * from todos order by id'
        return db.prepare(sql).all()
    }
    static findById(id) {
        const sql = 'select * from todos where id=?'
        return db.prepare(sql).get(id)
    }
    static create(todoData) {
        const { title, description, completed } = todoData
        const sql = `insert into todos (title,description,completed) values (?,?,?)`
        const res = db.prepare(sql).run(title, description, completed ? 1 : 0)
        return this.findById(res.lastInsertRowid)
    }
    static update(id, updata) {
        const { title, description, completed } = updata
        const sql = `update todos set title=?, description=?,completed=? where id=?`
        const res = db.prepare(sql).run(title, description, completed ? 1 : 0, id)
        if (res.changes === 0) return null;
        return this.findById(id)
    }
    static delete(id) {
        const sql = `delete from todos where id=?`
        const res = db.prepare(sql).run(id)
        return res.changes > 0
    }
}

//注册cors插件
fastify.register(require('@fastify/cors'), {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
})
//静态文件服务
fastify.register(require('@fastify/static'), {
    root: path.join(__dirname, 'public'),
    prefix: '/'
})

fastify.get('/api', async (request, reply) => {
    return {
        message: 'Todo API Server',
        version: '1.0.0',
        endpoints: [
            'GET    /api/todos',
            'GET    /api/todos/:id',
            'POST   /api/todos',
            'PUT    /api/todos/:id',
            'DELETE /api/todos/:id',
            'PATCH  /api/todos/:id/toggle'
        ]
    };
})

fastify.get('/api/todos', async (request, reply) => {
    try {
        const todos = Todo.findAll()
        return {
            success: true,
            data: todos,
            count: todos.length
        }
    } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
            success: false,
            error: 'get data failed!!!'
        })
    }
})
// 创建新的待办事项
fastify.post('/api/todos', async (request, reply) => {
    try {
        const { title, description, completed } = request.body;
        if (!title || title.length === 0) {
            return reply.status(400).send({
                success: false,
                error: 'title is required!!!'
            })
        }
        const newtodos = Todo.create({ title, description, completed })
        return reply.status(201).send({
            success: true,
            data: newtodos
        })
    } catch (error) {
        fastify.log.error(error)
        return reply.status(500).send({
            success: false,
            error: 'create data failed!!!'
        })
    }
})
// 更新待办事项
fastify.put('/api/todos/:id', async (request, reply) => {
    const { id } = request.params
    const updateData = request.body;
    const updateTodo = Todo.update(id, updateData)
    if (!updateTodo) {
        return reply.status(404).send({
            success: false,
            error: 'update data NOT exist!!!'
        })
    }
    return {
        success: true,
        data: updateTodo,
        message: 'update_success'
    }
})
// 删除待办事项
fastify.delete('/api/todos/:id', async (request, reply) => {
    const { id } = request.params
    const del=Todo.delete(id)
    if (!del) {
        return reply.status(404).send({
            success: false,
            error: 'delete data NOT exist!!!'
        })
    }
    return {
        success: true,
        message: 'delete_success'
    }
})

//启动服务器
initDatabase()
fastify.listen({ port: 3000, host: '0.0.0.0' })
console.log('-----------server_start!---------')