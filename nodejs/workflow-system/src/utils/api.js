const API_BASE = '/api';

async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });
  return response.json();
}

// 用户相关
export const userApi = {
  getAll: () => request('/users'),
  getByRole: (role) => request(`/users/role/${role}`),
  login: (username, password) => request('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  })
};

// 工作流相关
export const workflowApi = {
  getAll: () => request('/workflows'),
  getById: (id) => request(`/workflows/${id}`),
  create: (data) => request('/workflows', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

// 任务相关
export const taskApi = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tasks${query ? `?${query}` : ''}`);
  },
  getById: (id) => request(`/tasks/${id}`),
  create: (data) => request('/tasks', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  approve: (id, data) => request(`/tasks/${id}/approve`, {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  cancel: (id, userId) => request(`/tasks/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ user_id: userId })
  })
};

// 统计相关
export const statsApi = {
  get: (userId) => request(`/stats${userId ? `?user_id=${userId}` : ''}`)
};

// 工具函数
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    in_progress: '审批中',
    approved: '已通过',
    rejected: '已拒绝',
    cancelled: '已取消'
  };
  return statusMap[status] || status;
};

export const getTypeText = (type) => {
  const typeMap = {
    leave: '请假',
    expense: '报销',
    purchase: '采购',
    document: '文档',
    custom: '自定义'
  };
  return typeMap[type] || type;
};

export const getRoleText = (role) => {
  const roleMap = {
    admin: '管理员',
    manager: '经理',
    employee: '员工',
    hr: 'HR',
    finance: '财务'
  };
  return roleMap[role] || role;
};

export const getTypeIcon = (type) => {
  const iconMap = {
    leave: '🏖️',
    expense: '💰',
    purchase: '🛒',
    document: '📄',
    custom: '⚙️'
  };
  return iconMap[type] || '📋';
};
