// frontend/script.js (updated for table and pagination)
const API_BASE = 'http://localhost:8080/api/v1';
const POSTS_PER_PAGE = 10;

let currentPage = 1;
let allPosts = [];

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
}

function updateNav() {
    const token = getToken();
    if (token) {
        document.getElementById('auth-link').style.display = 'none';
        document.getElementById('profile-link').style.display = 'inline';
        document.getElementById('logout-link').style.display = 'inline';
    } else {
        document.getElementById('auth-link').style.display = 'inline';
        document.getElementById('profile-link').style.display = 'none';
        document.getElementById('logout-link').style.display = 'none';
    }
}

function showHome() {
    fetchPosts();
}

function showLogin() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h2 class="card-title">Login</h2>
                <form id="login-form">
                    <input type="email" id="login-email" placeholder="Email" required>
                    <input type="password" id="login-password" placeholder="Password" required>
                    <button type="submit" class="btn btn-primary">Login</button>
                </form>
                <p>Don't have an account? <a href="#" onclick="showRegister()">Register</a></p>
            </div>
        </div>
    `;
    document.getElementById('login-form').addEventListener('submit', login);
}

function showRegister() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h2 class="card-title">Register</h2>
                <form id="register-form">
                    <input type="text" id="register-username" placeholder="Username" required>
                    <input type="email" id="register-email" placeholder="Email" required>
                    <input type="password" id="register-password" placeholder="Password" required minlength="6">
                    <button type="submit" class="btn btn-primary">Register</button>
                </form>
                <p>Already have an account? <a href="#" onclick="showLogin()">Login</a></p>
            </div>
        </div>
    `;
    document.getElementById('register-form').addEventListener('submit', register);
}

function showProfile() {
    const token = getToken();
    if (!token) {
        showLogin();
        return;
    }
    fetch(`${API_BASE}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const content = document.getElementById('content');
            content.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h2 class="card-title">Profile</h2>
                        <p><strong>ID:</strong> ${data.data.id}</p>
                        <p><strong>Username:</strong> ${data.data.username}</p>
                        <p><strong>Email:</strong> ${data.data.email}</p>
                    </div>
                </div>
            `;
        } else {
            alert(data.error);
            logout();
        }
    })
    .catch(err => console.error(err));
}

function logout() {
    removeToken();
    updateNav();
    showHome();
}

function register(e) {
    e.preventDefault();
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            alert('Registered successfully. Please login.');
            showLogin();
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function login(e) {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            setToken(data.data.token);
            updateNav();
            showHome();
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function fetchPosts() {
    fetch(`${API_BASE}/posts`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            allPosts = data.data;
            renderPosts();
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function renderPosts(page = 1) {
    currentPage = page;
    const start = (page - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;
    const paginatedPosts = allPosts.slice(start, end);

    const content = document.getElementById('content');
    let html = '<h2>Posts</h2>';

    if (getToken()) {
        html += `
            <div class="card mb-3">
                <div class="card-body">
                    <h3 class="card-title">Create New Post</h3>
                    <form id="create-post-form">
                        <input type="text" id="post-title" placeholder="Title" required>
                        <textarea id="post-content" placeholder="Content" required></textarea>
                        <button type="submit" class="btn btn-primary">Create Post</button>
                    </form>
                </div>
            </div>
        `;
    }

    html += `
        <table class="table table-striped table-hover">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Content (Preview)</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    paginatedPosts.forEach(post => {
        const preview = post.Content.length > 100 ? post.Content.substring(0, 100) + '...' : post.Content;
        html += `
            <tr>
                <td>${post.ID}</td>
                <td>${post.Title}</td>
                <td>${preview}</td>
                <td>
                    <a href="#" class="btn btn-secondary btn-sm" onclick="showPost(${post.ID})">View</a>
                    ${getToken() ? `
                        <a href="#" class="btn btn-primary btn-sm" onclick="showEditPost(${post.ID})">Edit</a>
                        <a href="#" class="btn btn-danger btn-sm" onclick="deletePost(${post.ID})">Delete</a>
                    ` : ''}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    // Pagination
    const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE);
    if (totalPages > 1) {
        html += '<ul class="pagination">';
        for (let i = 1; i <= totalPages; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" onclick="renderPosts(${i})">${i}</a>
                </li>
            `;
        }
        html += '</ul>';
    }

    content.innerHTML = html;

    if (getToken()) {
        document.getElementById('create-post-form').addEventListener('submit', createPost);
    }
}

function showPost(id) {
    fetch(`${API_BASE}/posts/${id}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const post = data.data;
            const content = document.getElementById('content');
            let html = `
                <div class="card">
                    <div class="card-body">
                        <h2 class="card-title">${post.Title}</h2>
                        <p class="card-text">${post.Content}</p>
                    </div>
                </div>
                <h3>Comments</h3>
                <div id="comments"></div>
            `;
            if (getToken()) {
                html += `
                    <div class="card mt-3">
                        <div class="card-body">
                            <form id="create-comment-form">
                                <textarea id="comment-content" placeholder="Add a comment" required></textarea>
                                <button type="submit" class="btn btn-primary">Add Comment</button>
                            </form>
                        </div>
                    </div>
                `;
            }
            content.innerHTML = html;
            fetchComments(id);
            if (getToken()) {
                document.getElementById('create-comment-form').addEventListener('submit', (e) => createComment(e, id));
            }
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function fetchComments(postId) {
    fetch(`${API_BASE}/comments/post/${postId}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const commentsDiv = document.getElementById('comments');
            let html = '';
            data.data.forEach(comment => {
                html += `
                    <div class="comment card">
                        <div class="card-body">
                            <p class="card-text">${comment.Content}</p>
                        </div>
                    </div>
                `;
            });
            commentsDiv.innerHTML = html;
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function createPost(e) {
    e.preventDefault();
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;
    const token = getToken();
    fetch(`${API_BASE}/posts`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            fetchPosts();
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function showEditPost(id) {
    fetch(`${API_BASE}/posts/${id}`)
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            const post = data.data;
            const content = document.getElementById('content');
            content.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h2 class="card-title">Edit Post</h2>
                        <form id="edit-post-form">
                            <input type="text" id="edit-title" value="${post.Title}" required>
                            <textarea id="edit-content" required>${post.Content}</textarea>
                            <button type="submit" class="btn btn-primary">Update Post</button>
                        </form>
                    </div>
                </div>
            `;
            document.getElementById('edit-post-form').addEventListener('submit', (e) => updatePost(e, id));
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function updatePost(e, id) {
    e.preventDefault();
    const title = document.getElementById('edit-title').value;
    const content = document.getElementById('edit-content').value;
    const token = getToken();
    fetch(`${API_BASE}/posts/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, content })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            showPost(id);
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function deletePost(id) {
    if (confirm('Are you sure you want to delete this post?')) {
        const token = getToken();
        fetch(`${API_BASE}/posts/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                fetchPosts();
            } else {
                alert(data.error);
            }
        })
        .catch(err => console.error(err));
    }
}

function createComment(e, postId) {
    e.preventDefault();
    const content = document.getElementById('comment-content').value;
    const token = getToken();
    fetch(`${API_BASE}/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            fetchComments(postId);
            document.getElementById('comment-content').value = '';
        } else {
            alert(data.error);
        }
    })
    .catch(err => console.error(err));
}

function checkHealth() {
    fetch('http://localhost:8080/health')
    .then(res => res.json())
    .then(data => console.log(data))
    .catch(err => console.error(err));
}

// Initial load
updateNav();
showHome();
// For testing: checkHealth();