import Fastify from 'fastify';
import cors from '@fastify/cors';
import db from './db.js';

const fastify = Fastify({ logger: true });

// 启用CORS支持跨域
await fastify.register(cors, {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});

// ============== 用户相关API ==============

// 获取所有用户
fastify.get('/api/users', async () => {
  const users = db.prepare('SELECT id, username, name, email, role, department, avatar, created_at FROM users').all();
  return { success: true, data: users };
});

// 用户登录（简化版，仅用于演示）
fastify.post('/api/login', async (request) => {
  const { username, password } = request.body;
  const user = db.prepare('SELECT id, username, name, email, role, department, avatar FROM users WHERE username = ? AND password = ?').get(username, password || '123456');
  
  if (user) {
    return { success: true, data: user };
  }
  return { success: false, message: '用户名或密码错误' };
});

// 根据角色获取用户
fastify.get('/api/users/role/:role', async (request) => {
  const { role } = request.params;
  const users = db.prepare('SELECT id, username, name, email, role, department, avatar FROM users WHERE role = ?').all(role);
  return { success: true, data: users };
});

// ============== 工作流定义API ==============

// 获取所有工作流定义
fastify.get('/api/workflows', async () => {
  const workflows = db.prepare(`
    SELECT w.*, u.name as creator_name 
    FROM workflows w 
    LEFT JOIN users u ON w.created_by = u.id
    WHERE w.is_active = 1
  `).all();
  
  return { 
    success: true, 
    data: workflows.map(w => ({
      ...w,
      steps: JSON.parse(w.steps)
    }))
  };
});

// 获取单个工作流定义
fastify.get('/api/workflows/:id', async (request) => {
  const { id } = request.params;
  const workflow = db.prepare(`
    SELECT w.*, u.name as creator_name 
    FROM workflows w 
    LEFT JOIN users u ON w.created_by = u.id
    WHERE w.id = ?
  `).get(id);
  
  if (workflow) {
    return { 
      success: true, 
      data: {
        ...workflow,
        steps: JSON.parse(workflow.steps)
      }
    };
  }
  return { success: false, message: '工作流不存在' };
});

// 创建工作流定义
fastify.post('/api/workflows', async (request) => {
  const { name, description, type, steps, created_by } = request.body;
  
  const result = db.prepare(`
    INSERT INTO workflows (name, description, type, steps, created_by)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, description, type, JSON.stringify(steps), created_by);
  
  return { success: true, data: { id: result.lastInsertRowid } };
});

// ============== 任务实例API ==============

// 获取任务列表（支持筛选）
fastify.get('/api/tasks', async (request) => {
  const { status, created_by, approver_id, workflow_id } = request.query;
  
  let sql = `
    SELECT t.*, w.name as workflow_name, w.type as workflow_type, w.steps as workflow_steps,
           u.name as creator_name, u.department as creator_department, u.avatar as creator_avatar
    FROM tasks t
    JOIN workflows w ON t.workflow_id = w.id
    JOIN users u ON t.created_by = u.id
    WHERE 1=1
  `;
  const params = [];
  
  if (status) {
    sql += ' AND t.status = ?';
    params.push(status);
  }
  if (created_by) {
    sql += ' AND t.created_by = ?';
    params.push(created_by);
  }
  if (workflow_id) {
    sql += ' AND t.workflow_id = ?';
    params.push(workflow_id);
  }
  
  sql += ' ORDER BY t.created_at DESC';
  
  let tasks = db.prepare(sql).all(...params);
  
  // 如果指定了审批人，筛选需要该用户审批的任务
  if (approver_id) {
    const approver = db.prepare('SELECT role FROM users WHERE id = ?').get(approver_id);
    if (approver) {
      tasks = tasks.filter(task => {
        const steps = JSON.parse(task.workflow_steps);
        const currentStep = steps[task.current_step];
        return currentStep && currentStep.role === approver.role && task.status === 'in_progress';
      });
    }
  }
  
  return { 
    success: true, 
    data: tasks.map(t => ({
      ...t,
      data: t.data ? JSON.parse(t.data) : null,
      workflow_steps: JSON.parse(t.workflow_steps)
    }))
  };
});

// 获取单个任务详情
fastify.get('/api/tasks/:id', async (request) => {
  const { id } = request.params;
  
  const task = db.prepare(`
    SELECT t.*, w.name as workflow_name, w.type as workflow_type, w.steps as workflow_steps,
           u.name as creator_name, u.department as creator_department, u.avatar as creator_avatar
    FROM tasks t
    JOIN workflows w ON t.workflow_id = w.id
    JOIN users u ON t.created_by = u.id
    WHERE t.id = ?
  `).get(id);
  
  if (!task) {
    return { success: false, message: '任务不存在' };
  }
  
  const approvals = db.prepare(`
    SELECT a.*, u.name as approver_name, u.avatar as approver_avatar
    FROM approvals a
    LEFT JOIN users u ON a.approver_id = u.id
    WHERE a.task_id = ?
    ORDER BY a.step_index, a.created_at
  `).all(id);
  
  const logs = db.prepare(`
    SELECT l.*, u.name as user_name
    FROM logs l
    LEFT JOIN users u ON l.user_id = u.id
    WHERE l.task_id = ?
    ORDER BY l.created_at DESC
  `).all(id);
  
  return {
    success: true,
    data: {
      ...task,
      data: task.data ? JSON.parse(task.data) : null,
      workflow_steps: JSON.parse(task.workflow_steps),
      approvals,
      logs
    }
  };
});

// 创建新任务（发起审批）
fastify.post('/api/tasks', async (request) => {
  const { workflow_id, title, description, data, created_by } = request.body;
  
  // 获取工作流定义
  const workflow = db.prepare('SELECT * FROM workflows WHERE id = ?').get(workflow_id);
  if (!workflow) {
    return { success: false, message: '工作流不存在' };
  }
  
  const steps = JSON.parse(workflow.steps);
  
  // 创建任务
  const result = db.prepare(`
    INSERT INTO tasks (workflow_id, title, description, data, created_by, status, current_step)
    VALUES (?, ?, ?, ?, ?, 'in_progress', 1)
  `).run(workflow_id, title, description, JSON.stringify(data), created_by);
  
  const taskId = result.lastInsertRowid;
  
  // 为第一步（提交）创建审批记录
  db.prepare(`
    INSERT INTO approvals (task_id, step_index, step_name, approver_id, action)
    VALUES (?, 0, ?, ?, 'approved')
  `).run(taskId, steps[0].name, created_by);
  
  // 为后续步骤创建待审批记录
  for (let i = 1; i < steps.length; i++) {
    db.prepare(`
      INSERT INTO approvals (task_id, step_index, step_name, action)
      VALUES (?, ?, ?, 'pending')
    `).run(taskId, i, steps[i].name);
  }
  
  // 记录日志
  db.prepare(`
    INSERT INTO logs (task_id, user_id, action, details)
    VALUES (?, ?, ?, ?)
  `).run(taskId, created_by, 'create', `创建了任务: ${title}`);
  
  return { success: true, data: { id: taskId } };
});

// 审批任务
fastify.post('/api/tasks/:id/approve', async (request) => {
  const { id } = request.params;
  const { approver_id, action, comment } = request.body;
  
  const task = db.prepare(`
    SELECT t.*, w.steps as workflow_steps
    FROM tasks t
    JOIN workflows w ON t.workflow_id = w.id
    WHERE t.id = ?
  `).get(id);
  
  if (!task) {
    return { success: false, message: '任务不存在' };
  }
  
  if (task.status !== 'in_progress') {
    return { success: false, message: '任务状态不允许审批' };
  }
  
  const steps = JSON.parse(task.workflow_steps);
  const currentStep = task.current_step;
  
  // 验证审批人角色
  const approver = db.prepare('SELECT * FROM users WHERE id = ?').get(approver_id);
  if (!approver || approver.role !== steps[currentStep].role) {
    return { success: false, message: '您没有权限审批此任务' };
  }
  
  // 更新审批记录
  db.prepare(`
    UPDATE approvals 
    SET approver_id = ?, action = ?, comment = ?, created_at = CURRENT_TIMESTAMP
    WHERE task_id = ? AND step_index = ?
  `).run(approver_id, action, comment, id, currentStep);
  
  // 记录日志
  const actionText = action === 'approved' ? '批准' : '拒绝';
  db.prepare(`
    INSERT INTO logs (task_id, user_id, action, details)
    VALUES (?, ?, ?, ?)
  `).run(id, approver_id, action, `${approver.name} ${actionText}了任务${comment ? ': ' + comment : ''}`);
  
  if (action === 'approved') {
    // 检查是否是最后一步
    if (currentStep >= steps.length - 1) {
      // 完成任务
      db.prepare(`
        UPDATE tasks SET status = 'approved', current_step = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(currentStep, id);
    } else {
      // 进入下一步
      db.prepare(`
        UPDATE tasks SET current_step = current_step + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    }
  } else {
    // 拒绝任务
    db.prepare(`
      UPDATE tasks SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(id);
  }
  
  return { success: true, message: `任务已${actionText}` };
});

// 取消任务
fastify.post('/api/tasks/:id/cancel', async (request) => {
  const { id } = request.params;
  const { user_id } = request.body;
  
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  
  if (!task) {
    return { success: false, message: '任务不存在' };
  }
  
  if (task.created_by !== user_id) {
    return { success: false, message: '只有创建者可以取消任务' };
  }
  
  if (task.status !== 'pending' && task.status !== 'in_progress') {
    return { success: false, message: '任务状态不允许取消' };
  }
  
  db.prepare(`
    UPDATE tasks SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(id);
  
  db.prepare(`
    INSERT INTO logs (task_id, user_id, action, details)
    VALUES (?, ?, 'cancel', '取消了任务')
  `).run(id, user_id);
  
  return { success: true, message: '任务已取消' };
});

// ============== 统计API ==============

// 获取仪表盘统计数据
fastify.get('/api/stats', async (request) => {
  const { user_id } = request.query;
  
  const totalTasks = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
  const pendingTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'").get().count;
  const approvedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'approved'").get().count;
  const rejectedTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'rejected'").get().count;
  
  let myTasks = 0;
  let myPendingApprovals = 0;
  
  if (user_id) {
    myTasks = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE created_by = ?').get(user_id).count;
    
    const user = db.prepare('SELECT role FROM users WHERE id = ?').get(user_id);
    if (user) {
      const tasks = db.prepare(`
        SELECT t.*, w.steps as workflow_steps
        FROM tasks t
        JOIN workflows w ON t.workflow_id = w.id
        WHERE t.status = 'in_progress'
      `).all();
      
      myPendingApprovals = tasks.filter(task => {
        const steps = JSON.parse(task.workflow_steps);
        const currentStep = steps[task.current_step];
        return currentStep && currentStep.role === user.role;
      }).length;
    }
  }
  
  // 最近7天的任务统计
  const recentTasks = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM tasks
    WHERE created_at >= datetime('now', '-7 days')
    GROUP BY date(created_at)
    ORDER BY date
  `).all();
  
  // 按类型统计
  const tasksByType = db.prepare(`
    SELECT w.type, COUNT(*) as count
    FROM tasks t
    JOIN workflows w ON t.workflow_id = w.id
    GROUP BY w.type
  `).all();
  
  return {
    success: true,
    data: {
      totalTasks,
      pendingTasks,
      approvedTasks,
      rejectedTasks,
      myTasks,
      myPendingApprovals,
      recentTasks,
      tasksByType
    }
  };
});

// 启动服务器
const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' });
    console.log('后端服务器运行在 http://localhost:3001');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
