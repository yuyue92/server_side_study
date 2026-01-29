const API_BASE = '/api';
let currentPage = 'dashboard', tasks = [], projects = [], users = [], currentTaskPage = 1, totalTaskPages = 1, currentView = 'list';

document.addEventListener('DOMContentLoaded', () => { initNavigation(); initEventListeners(); loadDashboard(); loadProjects(); loadUsers(); });

function initNavigation() { document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => switchPage(item.dataset.page))); }

function switchPage(page) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.page === page));
    document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
    document.getElementById('page-' + page).classList.remove('hidden');
    currentPage = page;
    if (page === 'dashboard') loadDashboard();
    else if (page === 'tasks') loadTasks();
    else if (page === 'projects') loadProjectsList();
    else if (page === 'users') loadUsersList();
}

function initEventListeners() {
    document.getElementById('menuToggle').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
    document.getElementById('quickAddTask').addEventListener('click', () => openTaskModal());
    document.getElementById('globalSearch').addEventListener('input', debounce(() => { if (currentPage === 'tasks') loadTasks(); }, 300));
    ['filter-status', 'filter-priority', 'filter-project', 'filter-assignee'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('change', () => loadTasks()); });
    document.querySelectorAll('.view-toggle button').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
    const p = document.getElementById('task-progress'); if (p) p.addEventListener('input', e => document.getElementById('progress-value').textContent = e.target.value);
}

async function loadDashboard() {
    try {
        const r = await fetch(API_BASE + '/dashboard'), result = await r.json();
        if (result.success) {
            const s = result.data;
            document.getElementById('stat-total').textContent = s.total_tasks;
            document.getElementById('stat-todo').textContent = s.todo_tasks;
            document.getElementById('stat-progress').textContent = s.in_progress_tasks;
            document.getElementById('stat-completed').textContent = s.completed_tasks;
            document.getElementById('overdue-count').textContent = s.overdue_tasks;
            document.getElementById('today-count').textContent = s.tasks_due_today;
            document.getElementById('project-count').textContent = s.total_projects;
            document.getElementById('user-count').textContent = s.total_users;
            renderRecentTasks(s.recent_tasks || []);
        }
    } catch (e) { console.error(e); showToast('加载仪表盘失败', 'error'); }
}

function renderRecentTasks(tasks) {
    const c = document.getElementById('recent-tasks');
    if (!tasks.length) { c.innerHTML = '<div class="empty-state"><i class="bi bi-inbox"></i><h3>暂无任务</h3></div>'; return; }
    c.innerHTML = tasks.map(t => '<div class="recent-task-item" onclick="editTask(' + t.id + ')"><div class="task-checkbox ' + (t.status === 'completed' ? 'completed' : '') + '" onclick="event.stopPropagation();toggleTaskStatus(' + t.id + ',\'' + t.status + '\')"></div><div class="task-info"><div class="task-title">' + escapeHtml(t.title) + '</div><div class="task-meta">' + (t.project ? t.project.name : '无项目') + (t.due_date ? ' · ' + formatDate(t.due_date) : '') + '</div></div><span class="priority-badge priority-' + t.priority + '">' + getPriorityText(t.priority) + '</span></div>').join('');
}

async function loadTasks() {
    try {
        const params = new URLSearchParams(); params.append('page', currentTaskPage); params.append('page_size', 10);
        const status = document.getElementById('filter-status')?.value, priority = document.getElementById('filter-priority')?.value;
        const projectId = document.getElementById('filter-project')?.value, assigneeId = document.getElementById('filter-assignee')?.value;
        const search = document.getElementById('globalSearch')?.value;
        if (status) params.append('status', status); if (priority) params.append('priority', priority);
        if (projectId) params.append('project_id', projectId); if (assigneeId) params.append('assignee_id', assigneeId);
        if (search) params.append('search', search);
        const r = await fetch(API_BASE + '/tasks?' + params), result = await r.json();
        if (result.success) { tasks = result.data.data || []; totalTaskPages = result.data.total_pages; if (currentView === 'list') { renderTaskTable(tasks); renderPagination(result.data); } else renderKanbanBoard(); }
    } catch (e) { console.error(e); showToast('加载任务失败', 'error'); }
}

function renderTaskTable(tasks) {
    const c = document.getElementById('task-table-body');
    if (!tasks.length) { c.innerHTML = '<div class="empty-state"><i class="bi bi-clipboard-check"></i><h3>暂无任务</h3></div>'; return; }
    c.innerHTML = tasks.map(t => '<div class="task-table-row"><div class="col-check"><input type="checkbox"></div><div class="col-title"><div>' + escapeHtml(t.title) + '</div>' + (t.description ? '<div class="task-desc">' + escapeHtml(t.description) + '</div>' : '') + '</div><div class="col-project">' + (t.project ? '<span class="project-tag"><i class="bi bi-folder"></i> ' + escapeHtml(t.project.name) + '</span>' : '-') + '</div><div class="col-assignee">' + (t.assignee ? '<span class="avatar-sm">' + t.assignee.username.charAt(0) + '</span><span>' + escapeHtml(t.assignee.username) + '</span>' : '-') + '</div><div class="col-priority"><span class="priority-badge priority-' + t.priority + '">' + getPriorityText(t.priority) + '</span></div><div class="col-status"><span class="status-badge status-' + t.status + '"><span class="status-dot"></span>' + getStatusText(t.status) + '</span></div><div class="col-due ' + (isOverdue(t.due_date, t.status) ? 'overdue' : '') + '">' + (t.due_date ? formatDate(t.due_date) : '-') + '</div><div class="col-actions"><button onclick="editTask(' + t.id + ')"><i class="bi bi-pencil"></i></button><button class="delete" onclick="confirmDeleteTask(' + t.id + ')"><i class="bi bi-trash"></i></button></div></div>').join('');
}

function renderPagination(d) {
    const c = document.getElementById('task-pagination'); if (d.total_pages <= 1) { c.innerHTML = ''; return; }
    let h = '<button onclick="goToPage(' + (d.page - 1) + ')" ' + (d.page <= 1 ? 'disabled' : '') + '><i class="bi bi-chevron-left"></i></button>';
    for (let i = 1; i <= d.total_pages; i++) { if (i === 1 || i === d.total_pages || (i >= d.page - 2 && i <= d.page + 2)) h += '<button class="' + (i === d.page ? 'active' : '') + '" onclick="goToPage(' + i + ')">' + i + '</button>'; else if (i === d.page - 3 || i === d.page + 3) h += '<span>...</span>'; }
    h += '<button onclick="goToPage(' + (d.page + 1) + ')" ' + (d.page >= d.total_pages ? 'disabled' : '') + '><i class="bi bi-chevron-right"></i></button><span class="pagination-info">共 ' + d.total + ' 条</span>';
    c.innerHTML = h;
}

function goToPage(p) { if (p < 1 || p > totalTaskPages) return; currentTaskPage = p; loadTasks(); }

function switchView(v) {
    currentView = v; document.querySelectorAll('.view-toggle button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
    document.getElementById('task-list-view').classList.toggle('hidden', v !== 'list');
    document.getElementById('kanban-view').classList.toggle('hidden', v !== 'kanban');
    v === 'kanban' ? renderKanbanBoard() : loadTasks();
}

async function renderKanbanBoard() {
    try {
        const r = await fetch(API_BASE + '/tasks?page_size=100'), result = await r.json();
        if (result.success) {
            const all = result.data.data || [], todo = all.filter(t => t.status === 'todo'), prog = all.filter(t => t.status === 'in_progress'), done = all.filter(t => t.status === 'completed');
            document.getElementById('kanban-todo-count').textContent = todo.length; document.getElementById('kanban-progress-count').textContent = prog.length; document.getElementById('kanban-completed-count').textContent = done.length;
            document.getElementById('kanban-todo').innerHTML = renderKanbanTasks(todo); document.getElementById('kanban-progress').innerHTML = renderKanbanTasks(prog); document.getElementById('kanban-completed').innerHTML = renderKanbanTasks(done);
        }
    } catch (e) { console.error(e); }
}

function renderKanbanTasks(tasks) {
    if (!tasks.length) return '<div class="empty-state"><p>暂无任务</p></div>';
    return tasks.map(t => '<div class="kanban-task" onclick="editTask(' + t.id + ')"><div class="kanban-task-title">' + escapeHtml(t.title) + '</div><div class="kanban-task-meta"><span class="priority-badge priority-' + t.priority + '">' + getPriorityText(t.priority) + '</span>' + (t.assignee ? '<span class="avatar-sm" style="width:24px;height:24px;font-size:0.6rem;">' + t.assignee.username.charAt(0) + '</span>' : '') + '</div></div>').join('');
}

function openTaskModal(id) {
    const m = document.getElementById('task-modal'), t = document.getElementById('task-modal-title'), sr = document.getElementById('task-status-row');
    document.getElementById('task-form').reset(); document.getElementById('task-id').value = ''; document.getElementById('progress-value').textContent = '0';
    populateProjectSelect('task-project'); populateUserSelect('task-assignee');
    if (id) { t.textContent = '编辑任务'; sr.style.display = 'grid'; loadTaskDetails(id); } else { t.textContent = '新建任务'; sr.style.display = 'none'; }
    m.classList.remove('hidden');
}

async function loadTaskDetails(id) {
    try {
        const r = await fetch(API_BASE + '/tasks/' + id), result = await r.json();
        if (result.success) {
            const t = result.data;
            document.getElementById('task-id').value = t.id; document.getElementById('task-title').value = t.title;
            document.getElementById('task-description').value = t.description || ''; document.getElementById('task-project').value = t.project_id || '';
            document.getElementById('task-assignee').value = t.assignee_id || ''; document.getElementById('task-priority').value = t.priority;
            document.getElementById('task-status').value = t.status; document.getElementById('task-progress').value = t.progress;
            document.getElementById('progress-value').textContent = t.progress;
            if (t.due_date) document.getElementById('task-due').value = t.due_date.split('T')[0];
        }
    } catch (e) { console.error(e); showToast('加载任务详情失败', 'error'); }
}

function closeTaskModal() { document.getElementById('task-modal').classList.add('hidden'); }

async function saveTask(e) {
    e.preventDefault(); const id = document.getElementById('task-id').value, isEdit = !!id;
    const data = { title: document.getElementById('task-title').value, description: document.getElementById('task-description').value, priority: document.getElementById('task-priority').value, due_date: document.getElementById('task-due').value || null };
    const pid = document.getElementById('task-project').value, aid = document.getElementById('task-assignee').value;
    if (pid) data.project_id = parseInt(pid); if (aid) data.assignee_id = parseInt(aid);
    if (isEdit) { data.status = document.getElementById('task-status').value; data.progress = parseInt(document.getElementById('task-progress').value); }
    try {
        const r = await fetch(isEdit ? API_BASE + '/tasks/' + id : API_BASE + '/tasks', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), result = await r.json();
        if (result.success) { showToast(isEdit ? '任务更新成功' : '任务创建成功', 'success'); closeTaskModal(); loadTasks(); loadDashboard(); } else showToast(result.error || '操作失败', 'error');
    } catch (err) { console.error(err); showToast('保存任务失败', 'error'); }
}

function editTask(id) { openTaskModal(id); }

async function toggleTaskStatus(id, status) {
    const ns = status === 'completed' ? 'todo' : 'completed';
    try { const r = await fetch(API_BASE + '/tasks/' + id + '/progress', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: ns, progress: ns === 'completed' ? 100 : 0 }) }), result = await r.json(); if (result.success) { loadDashboard(); if (currentPage === 'tasks') loadTasks(); } } catch (e) { console.error(e); }
}

function confirmDeleteTask(id) { document.getElementById('confirm-message').textContent = '确定要删除这个任务吗？此操作不可恢复。'; document.getElementById('confirm-delete-btn').onclick = () => deleteTask(id); document.getElementById('confirm-modal').classList.remove('hidden'); }

async function deleteTask(id) { try { const r = await fetch(API_BASE + '/tasks/' + id, { method: 'DELETE' }), result = await r.json(); if (result.success) { showToast('任务删除成功', 'success'); closeConfirmModal(); loadTasks(); loadDashboard(); } else showToast(result.error || '删除失败', 'error'); } catch (e) { console.error(e); showToast('删除任务失败', 'error'); } }

async function loadProjects() { try { const r = await fetch(API_BASE + '/projects'), result = await r.json(); if (result.success) { projects = result.data || []; populateProjectFilter(); } } catch (e) { console.error(e); } }

async function loadProjectsList() { try { const r = await fetch(API_BASE + '/projects'), result = await r.json(); if (result.success) { projects = result.data || []; renderProjects(projects); } } catch (e) { console.error(e); } }

function renderProjects(projects) {
    const c = document.getElementById('projects-grid');
    if (!projects.length) { c.innerHTML = '<div class="empty-state"><i class="bi bi-folder"></i><h3>暂无项目</h3></div>'; return; }
    c.innerHTML = projects.map(p => { const ts = p.tasks || [], done = ts.filter(t => t.status === 'completed').length, total = ts.length, prog = total > 0 ? Math.round((done / total) * 100) : 0;
        return '<div class="project-card"><div class="project-card-header"><h3>' + escapeHtml(p.name) + '</h3><span class="project-status ' + p.status + '">' + getProjectStatusText(p.status) + '</span></div><p class="project-card-desc">' + escapeHtml(p.description || '暂无描述') + '</p><div class="project-card-stats"><div class="project-stat"><div class="project-stat-value">' + total + '</div><div class="project-stat-label">总任务</div></div><div class="project-stat"><div class="project-stat-value">' + done + '</div><div class="project-stat-label">已完成</div></div><div class="project-stat"><div class="project-stat-value">' + prog + '%</div><div class="project-stat-label">进度</div></div></div><div class="project-card-footer"><div class="project-manager">' + (p.manager ? '<span class="avatar-sm" style="width:24px;height:24px;font-size:0.6rem;">' + p.manager.username.charAt(0) + '</span>' + p.manager.username : '未分配') + '</div><div class="project-actions"><button class="btn btn-sm btn-secondary" onclick="editProject(' + p.id + ')"><i class="bi bi-pencil"></i></button><button class="btn btn-sm btn-secondary" onclick="confirmDeleteProject(' + p.id + ')"><i class="bi bi-trash"></i></button></div></div></div>';
    }).join('');
}

function openProjectModal(id) {
    const m = document.getElementById('project-modal'), t = document.getElementById('project-modal-title'), sg = document.getElementById('project-status-group');
    document.getElementById('project-form').reset(); document.getElementById('project-id').value = ''; populateUserSelect('project-manager');
    if (id) { t.textContent = '编辑项目'; sg.style.display = 'block'; loadProjectDetails(id); } else { t.textContent = '新建项目'; sg.style.display = 'none'; }
    m.classList.remove('hidden');
}

async function loadProjectDetails(id) { try { const r = await fetch(API_BASE + '/projects/' + id), result = await r.json(); if (result.success) { const p = result.data; document.getElementById('project-id').value = p.id; document.getElementById('project-name').value = p.name; document.getElementById('project-description').value = p.description || ''; document.getElementById('project-manager').value = p.manager_id || ''; document.getElementById('project-status').value = p.status; if (p.start_date) document.getElementById('project-start').value = p.start_date.split('T')[0]; if (p.end_date) document.getElementById('project-end').value = p.end_date.split('T')[0]; } } catch (e) { console.error(e); } }

function closeProjectModal() { document.getElementById('project-modal').classList.add('hidden'); }

async function saveProject(e) {
    e.preventDefault(); const id = document.getElementById('project-id').value, isEdit = !!id;
    const data = { name: document.getElementById('project-name').value, description: document.getElementById('project-description').value, start_date: document.getElementById('project-start').value || null, end_date: document.getElementById('project-end').value || null };
    const mid = document.getElementById('project-manager').value; if (mid) data.manager_id = parseInt(mid); if (isEdit) data.status = document.getElementById('project-status').value;
    try { const r = await fetch(isEdit ? API_BASE + '/projects/' + id : API_BASE + '/projects', { method: isEdit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), result = await r.json(); if (result.success) { showToast(isEdit ? '项目更新成功' : '项目创建成功', 'success'); closeProjectModal(); loadProjectsList(); loadProjects(); } else showToast(result.error || '操作失败', 'error'); } catch (err) { console.error(err); showToast('保存项目失败', 'error'); }
}

function editProject(id) { openProjectModal(id); }
function confirmDeleteProject(id) { document.getElementById('confirm-message').textContent = '确定要删除这个项目吗？项目下的任务将变为无项目状态。'; document.getElementById('confirm-delete-btn').onclick = () => deleteProject(id); document.getElementById('confirm-modal').classList.remove('hidden'); }
async function deleteProject(id) { try { const r = await fetch(API_BASE + '/projects/' + id, { method: 'DELETE' }), result = await r.json(); if (result.success) { showToast('项目删除成功', 'success'); closeConfirmModal(); loadProjectsList(); loadProjects(); } else showToast(result.error || '删除失败', 'error'); } catch (e) { console.error(e); showToast('删除项目失败', 'error'); } }

async function loadUsers() { try { const r = await fetch(API_BASE + '/users'), result = await r.json(); if (result.success) { users = result.data || []; populateUserFilter(); } } catch (e) { console.error(e); } }
async function loadUsersList() { try { const r = await fetch(API_BASE + '/users'), result = await r.json(); if (result.success) { users = result.data || []; renderUsers(users); } } catch (e) { console.error(e); } }

function renderUsers(users) {
    const c = document.getElementById('users-grid');
    if (!users.length) { c.innerHTML = '<div class="empty-state"><i class="bi bi-people"></i><h3>暂无成员</h3></div>'; return; }
    c.innerHTML = users.map(u => '<div class="user-card"><div class="avatar-lg"><i class="bi bi-person"></i></div><h3>' + escapeHtml(u.username) + '</h3><p class="email">' + escapeHtml(u.email) + '</p><span class="role-badge ' + u.role + '">' + getRoleText(u.role) + '</span></div>').join('');
}

function openUserModal() { document.getElementById('user-form').reset(); document.getElementById('user-modal').classList.remove('hidden'); }
function closeUserModal() { document.getElementById('user-modal').classList.add('hidden'); }

async function saveUser(e) {
    e.preventDefault();
    const data = { username: document.getElementById('user-name').value, email: document.getElementById('user-email').value, role: document.getElementById('user-role').value };
    try { const r = await fetch(API_BASE + '/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }), result = await r.json(); if (result.success) { showToast('成员添加成功', 'success'); closeUserModal(); loadUsersList(); loadUsers(); } else showToast(result.error || '添加失败', 'error'); } catch (err) { console.error(err); showToast('添加成员失败', 'error'); }
}

function populateProjectSelect(id) { const s = document.getElementById(id); if (!s) return; s.innerHTML = '<option value="">无项目</option>' + projects.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join(''); }
function populateProjectFilter() { const s = document.getElementById('filter-project'); if (!s) return; s.innerHTML = '<option value="">所有项目</option>' + projects.map(p => '<option value="' + p.id + '">' + escapeHtml(p.name) + '</option>').join(''); }
function populateUserSelect(id) { const s = document.getElementById(id); if (!s) return; s.innerHTML = '<option value="">未分配</option>' + users.map(u => '<option value="' + u.id + '">' + escapeHtml(u.username) + '</option>').join(''); }
function populateUserFilter() { const s = document.getElementById('filter-assignee'); if (!s) return; s.innerHTML = '<option value="">所有成员</option>' + users.map(u => '<option value="' + u.id + '">' + escapeHtml(u.username) + '</option>').join(''); }
function closeConfirmModal() { document.getElementById('confirm-modal').classList.add('hidden'); }

function getPriorityText(p) { return { high: '高', medium: '中', low: '低' }[p] || p; }
function getStatusText(s) { return { todo: '待办', in_progress: '进行中', completed: '已完成' }[s] || s; }
function getProjectStatusText(s) { return { planning: '计划中', in_progress: '进行中', completed: '已完成' }[s] || s; }
function getRoleText(r) { return { admin: '管理员', project_manager: '项目经理', team_member: '团队成员', guest: '访客' }[r] || r; }
function formatDate(d) { if (!d) return ''; const date = new Date(d); return (date.getMonth() + 1) + '/' + date.getDate(); }
function isOverdue(d, s) { if (!d || s === 'completed') return false; return new Date(d) < new Date(new Date().toDateString()); }
function escapeHtml(t) { if (!t) return ''; const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
function debounce(f, w) { let t; return function(...a) { clearTimeout(t); t = setTimeout(() => f(...a), w); }; }
function showToast(msg, type) { const c = document.getElementById('toast-container'), icons = { success: 'bi-check-circle', error: 'bi-x-circle', warning: 'bi-exclamation-triangle', info: 'bi-info-circle' }; const t = document.createElement('div'); t.className = 'toast ' + (type || 'info'); t.innerHTML = '<i class="bi ' + icons[type || 'info'] + '"></i><span class="toast-message">' + escapeHtml(msg) + '</span><button class="toast-close" onclick="this.parentElement.remove()"><i class="bi bi-x"></i></button>'; c.appendChild(t); setTimeout(() => t.remove(), 4000); }
