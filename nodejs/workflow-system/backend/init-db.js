import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(join(__dirname, 'workflow.db'));

// 启用外键约束
db.pragma('foreign_keys = ON');

// 创建用户表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL DEFAULT '123456',
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'employee', 'hr', 'finance')),
    department TEXT NOT NULL,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建工作流定义表
db.exec(`
  CREATE TABLE IF NOT EXISTS workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK(type IN ('leave', 'expense', 'purchase', 'document', 'custom')),
    steps TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建任务实例表
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workflow_id INTEGER NOT NULL REFERENCES workflows(id),
    title TEXT NOT NULL,
    description TEXT,
    current_step INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'approved', 'rejected', 'cancelled')),
    data TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建审批记录表
db.exec(`
  CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    step_index INTEGER NOT NULL,
    step_name TEXT NOT NULL,
    approver_id INTEGER REFERENCES users(id),
    action TEXT CHECK(action IN ('pending', 'approved', 'rejected', 'cancelled')),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 创建操作日志表
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER REFERENCES tasks(id),
    user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// 插入示例用户数据
const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (username, name, email, role, department, avatar)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const users = [
  ['zhangsan', '张三', 'zhangsan@company.com', 'employee', '技术部', '👨‍💻'],
  ['lisi', '李四', 'lisi@company.com', 'employee', '市场部', '👨‍💼'],
  ['wangwu', '王五', 'wangwu@company.com', 'manager', '技术部', '👨‍🔬'],
  ['zhaoliu', '赵六', 'zhaoliu@company.com', 'manager', '市场部', '👩‍💼'],
  ['sunqi', '孙七', 'sunqi@company.com', 'hr', '人事部', '👩‍⚖️'],
  ['zhouba', '周八', 'zhouba@company.com', 'finance', '财务部', '👨‍💰'],
  ['admin', '管理员', 'admin@company.com', 'admin', '管理层', '👑'],
];

users.forEach(user => insertUser.run(...user));

// 插入示例工作流定义
const insertWorkflow = db.prepare(`
  INSERT OR IGNORE INTO workflows (id, name, description, type, steps, created_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const workflows = [
  [
    1,
    '请假审批流程',
    '员工请假申请，需要经理审批后由HR最终确认',
    'leave',
    JSON.stringify([
      { name: '提交申请', role: 'employee', type: 'submit' },
      { name: '部门经理审批', role: 'manager', type: 'approve' },
      { name: 'HR确认', role: 'hr', type: 'approve' }
    ]),
    7
  ],
  [
    2,
    '报销审批流程',
    '员工报销申请，需要经理和财务审批',
    'expense',
    JSON.stringify([
      { name: '提交报销单', role: 'employee', type: 'submit' },
      { name: '部门经理审批', role: 'manager', type: 'approve' },
      { name: '财务审核', role: 'finance', type: 'approve' }
    ]),
    7
  ],
  [
    3,
    '采购审批流程',
    '采购申请，需要多级审批',
    'purchase',
    JSON.stringify([
      { name: '提交采购申请', role: 'employee', type: 'submit' },
      { name: '部门经理审批', role: 'manager', type: 'approve' },
      { name: '财务审核', role: 'finance', type: 'approve' },
      { name: '管理层批准', role: 'admin', type: 'approve' }
    ]),
    7
  ],
  [
    4,
    '文档审批流程',
    '文档起草、审核、批准流程',
    'document',
    JSON.stringify([
      { name: '起草文档', role: 'employee', type: 'submit' },
      { name: '初审', role: 'manager', type: 'approve' },
      { name: '复审', role: 'admin', type: 'approve' }
    ]),
    7
  ]
];

workflows.forEach(workflow => insertWorkflow.run(...workflow));

console.log('数据库初始化完成！');
console.log('已创建表：users, workflows, tasks, approvals, logs');
console.log('已插入示例数据：7个用户，4个工作流定义');

db.close();
