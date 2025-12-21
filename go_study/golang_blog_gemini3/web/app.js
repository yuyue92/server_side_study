const API_BASE = 'http://localhost:8080/api/v1';

// --- 状态管理 ---
let currentUser = null; // 存储当前登录用户的信息 {id, username, email}
let token = localStorage.getItem('token');

// --- 初始化 ---
document.addEventListener('DOMContentLoaded', () => {
    if (token) {
        fetchProfile();
    } else {
        updateNav();
        showHome();
    }
});

// --- API 工具函数 ---
async function apiFetch(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);

    try {
        const res = await fetch(`${API_BASE}${endpoint}`, config);
        const data = await res.json();

        // 处理 401 token 失效
        if (res.status === 401) {
            logout();
            showMessage('认证已过期，请重新登录', 'error');
            return null;
        }

        return data;
    } catch (err) {
        showMessage('网络错误，请检查后端是否启动', 'error');
        console.error(err);
        return null;
    }
}

// --- 认证逻辑 ---
async function fetchProfile() {
    const res = await apiFetch('/profile');
    if (res && res.code === 200) {
        currentUser = res.data;
        updateNav();
        showHome(); // 登录状态下加载首页
    } else {
        logout();
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const res = await apiFetch('/auth/login', 'POST', { email, password });
    if (res.code === 200) {
        token = res.data.token;
        localStorage.setItem('token', token);
        showMessage('登录成功', 'success');
        fetchProfile();
    } else {
        showMessage(res.msg || '登录失败', 'error');
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    const res = await apiFetch('/auth/register', 'POST', { username, email, password });
    if (res.code === 200) {
        showMessage('注册成功，请登录', 'success');
        showLogin();
    } else {
        showMessage(res.msg || '注册失败', 'error');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    updateNav();
    showLogin();
}

// --- 页面路由/视图切换 ---
function hideAllViews() {
    document.querySelectorAll('.view').forEach(el => el.style.display = 'none');
    document.getElementById('message-box').style.display = 'none';
}

function updateNav() {
    if (currentUser) {
        document.getElementById('guest-nav').style.display = 'none';
        document.getElementById('user-nav').style.display = 'inline';
        document.getElementById('username-display').textContent = `你好, ${currentUser.username}`;
    } else {
        document.getElementById('guest-nav').style.display = 'inline';
        document.getElementById('user-nav').style.display = 'none';
    }
}

function showLogin() { hideAllViews(); document.getElementById('login-view').style.display = 'block'; }
function showRegister() { hideAllViews(); document.getElementById('register-view').style.display = 'block'; }

function showHome() {
    hideAllViews();
    document.getElementById('posts-view').style.display = 'block';
    loadPosts();
}

// --- 分页状态 ---
let currentPage = 1;
let pageSize = 5;
let currentKeyword = "";
let totalCount = 0;

// 修改搜索处理
function handleSearch() {
    currentKeyword = document.getElementById('search-input').value;
    currentPage = 1; // 搜索时重置回第一页
    loadPosts();
}

// 修改分页处理
function changePage(step) {
    const newPage = currentPage + step;
    if (newPage < 1 || newPage > Math.ceil(totalCount / pageSize)) return;
    currentPage = newPage;
    loadPosts();
}
let currentCategory = "全部";
let commentPage = 1;
let currentDetailPostId = null;

// 文章过滤
function filterCategory(cat) {
    currentCategory = cat;
    currentPage = 1;
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    loadPosts();
}
// --- 文章功能 ---
async function loadPosts() {
    const endpoint = `/posts?page=${currentPage}&size=${pageSize}&keyword=${encodeURIComponent(currentKeyword)}&category=${encodeURIComponent(currentCategory)}`;
    const res = await apiFetch(endpoint);
    const container = document.getElementById('posts-list');
    container.innerHTML = '';

    if (res && res.data) {
        const { list, total, page } = res.data;
        totalCount = total;

        document.getElementById('page-info').textContent = `第 ${page} / ${Math.ceil(total / pageSize) || 1} 页`;
        document.getElementById('prev-btn').disabled = (page <= 1);
        document.getElementById('next-btn').disabled = (page >= Math.ceil(total / pageSize));

        if (list.length === 0) {
            container.innerHTML = '<tr><td colspan="6" style="text-align:center">暂无文章数据</td></tr>';
            return;
        }

        list.forEach(post => {
            const date = new Date(post.CreatedAt).toLocaleDateString();
            const tr = document.createElement('tr');
            // 点击整行进入详情，但排除按钮区域
            tr.onclick = (e) => {
                if (e.target.tagName !== 'BUTTON') showPostDetail(post.ID);
            };

            tr.innerHTML = `
                <td>${post.ID}</td>
                <td><strong>${post.title}</strong></td>
                <td><span class="badge">${post.category || '默认'}</span></td>
                <td>${post.user.username}</td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.8rem;" onclick="showPostDetail(${post.ID})">查看</button>
                    ${currentUser && currentUser.ID === post.user_id ?
                    `<button class="btn btn-outline" style="padding: 2px 8px; font-size: 0.8rem; color:red;" onclick="deletePost(${post.ID})">删除</button>` : ''
                }
                </td>
            `;
            container.appendChild(tr);
        });
    }
}

async function showPostDetail(id) {
    hideAllViews();
    document.getElementById('detail-view').style.display = 'block';

    const res = await apiFetch(`/posts/${id}`);
    const contentDiv = document.getElementById('post-detail-content');
    const commentsList = document.getElementById('comments-list');
    const commentForm = document.getElementById('comment-form');
    const loginTip = document.getElementById('login-to-comment');

    if (res && res.data) {
        const post = res.data;
        const isAuthor = currentUser && currentUser.ID === post.user_id;

        // 渲染文章主体
        contentDiv.innerHTML = `
            <h1>${post.title}</h1>
            <div class="post-meta">
                作者: ${post.user.username} 
                ${isAuthor ? `
                    <button class="edit-btn" onclick="showEditPost(${post.ID})">编辑</button>
                    <button class="delete-btn" onclick="deletePost(${post.ID})">删除</button>
                ` : ''}
            </div>
            <div class="post-body"><p>${post.content}</p></div>
        `;

        // 渲染评论控制区
        // 存储当前文章ID给评论提交使用
        commentForm.dataset.postId = post.ID;
        if (currentUser) {
            commentForm.style.display = 'block';
            loginTip.style.display = 'none';
        } else {
            commentForm.style.display = 'none';
            loginTip.style.display = 'block';
        }

        // 加载评论
        loadComments(id);
    }
}

async function loadComments(postId) {
    const res = await apiFetch(`/comments/post/${postId}`);
    const list = document.getElementById('comments-list');
    list.innerHTML = '';

    if (res && res.data && res.data.length > 0) {
        res.data.forEach(c => {
            const div = document.createElement('div');
            div.className = 'comment';
            div.innerHTML = `
                <div class="comment-user">${c.user.username}:</div>
                <div>${c.content}</div>
            `;
            list.appendChild(div);
        });
    } else {
        list.innerHTML = '<p style="color:#999">暂无评论，快来抢沙发吧~</p>';
    }
}

async function handleComment(e) {
    e.preventDefault();
    const form = e.target;
    const postId = form.dataset.postId;
    const content = document.getElementById('comment-content').value;

    const res = await apiFetch(`/posts/${postId}/comments`, 'POST', { content });
    if (res.code === 200) {
        document.getElementById('comment-content').value = ''; // 清空
        loadComments(postId); // 刷新评论
        showMessage('评论成功', 'success');
    } else {
        showMessage('评论失败', 'error');
    }
}

// --- 创建/编辑文章 ---
function showCreatePost() {
    hideAllViews();
    document.getElementById('editor-view').style.display = 'block';
    document.getElementById('editor-title').innerText = '发布新文章';
    document.getElementById('edit-post-id').value = '';
    document.getElementById('post-title').value = '';
    document.getElementById('post-content').value = '';
}

async function showEditPost(id) {
    // 先获取详情填入表单
    const res = await apiFetch(`/posts/${id}`);
    if (res && res.data) {
        hideAllViews();
        document.getElementById('editor-view').style.display = 'block';
        document.getElementById('editor-title').innerText = '编辑文章';
        document.getElementById('edit-post-id').value = res.data.ID;
        document.getElementById('post-title').value = res.data.title;
        document.getElementById('post-content').value = res.data.content;
    }
}

async function handleSavePost(e) {
    e.preventDefault();
    const id = document.getElementById('edit-post-id').value;
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;

    let res;
    if (id) {
        // 编辑 (PUT)
        res = await apiFetch(`/posts/${id}`, 'PUT', { title, content });
    } else {
        // 新建 (POST)
        res = await apiFetch('/posts', 'POST', { title, content });
    }

    if (res.code === 200) {
        showMessage('保存成功', 'success');
        showHome();
    } else {
        showMessage(res.msg || '保存失败', 'error');
    }
}

async function deletePost(id) {
    if (!confirm("确定要删除这篇文章吗？")) return;

    const res = await apiFetch(`/posts/${id}`, 'DELETE');
    if (res.code === 200) {
        showMessage('删除成功', 'success');
        showHome();
    } else {
        showMessage(res.msg || '删除失败', 'error');
    }
}

// --- 通用工具 ---
function showMessage(msg, type) {
    const box = document.getElementById('message-box');
    box.textContent = msg;
    box.className = `message-box ${type}`;
    box.style.display = 'block';
    setTimeout(() => {
        box.style.display = 'none';
    }, 3000);
}