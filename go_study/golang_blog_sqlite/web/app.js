(function () {
  const LS_API_BASE = "gb_api_base";
  const LS_TOKEN = "gb_token";
  const LS_LOGS = "gb_logs_v1";

  const $ = (id) => document.getElementById(id);

  const apiBaseInput = $("apiBaseInput");
  const saveApiBaseBtn = $("saveApiBaseBtn");
  const tokenStatus = $("tokenStatus");
  const logoutBtn = $("logoutBtn");
  const logsEl = $("logs");
  const clearLogsBtn = $("clearLogsBtn");

  function nowTime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  function safeJsonParse(s) {
    try { return JSON.parse(s); } catch { return null; }
  }
  function pretty(v) {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }

  function getApiBase() {
    const saved = localStorage.getItem(LS_API_BASE);
    return saved || (location.origin || "http://localhost:8080");
  }
  function setApiBase(v) { localStorage.setItem(LS_API_BASE, v); }

  function getToken() { return localStorage.getItem(LS_TOKEN) || ""; }
  function setToken(t) {
    if (t) localStorage.setItem(LS_TOKEN, t);
    else localStorage.removeItem(LS_TOKEN);
    updateTokenStatus();
  }
  function updateTokenStatus() {
    const t = getToken();
    tokenStatus.textContent = t ? `已登录 · ${t.slice(0, 18)}...` : "未登录";
  }

  function loadLogs() {
    const raw = localStorage.getItem(LS_LOGS);
    const arr = raw ? safeJsonParse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  }
  function saveLogs(arr) { localStorage.setItem(LS_LOGS, JSON.stringify(arr.slice(0, 20))); }
  function pushLog(item) {
    const logs = loadLogs();
    logs.unshift(item);
    saveLogs(logs);
    renderLogs();
  }
  function renderLogs() {
    const logs = loadLogs();
    logsEl.innerHTML = "";
    if (!logs.length) {
      logsEl.innerHTML = `<div class="muted" style="font-size:13px">暂无日志</div>`;
      return;
    }
    for (const l of logs) {
      const div = document.createElement("div");
      div.className = "log";
      div.innerHTML = `
        <div class="log-top">
          <div class="log-time">${l.time}</div>
          <div class="log-badge">${l.status}</div>
        </div>
        <div class="log-line">${l.method} ${l.path}</div>
      `;
      div.title = l.details || "";
      logsEl.appendChild(div);
    }
  }

  async function apiFetch(path, options = {}) {
    const base = getApiBase().replace(/\/$/, "");
    const url = base + path;
    const method = (options.method || "GET").toUpperCase();
    const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    const token = getToken();
    if (token) headers["Authorization"] = "Bearer " + token;

    const start = performance.now();
    try {
      const resp = await fetch(url, { method, headers, body: options.body });
      const status = resp.status;
      const text = await resp.text();
      const data = safeJsonParse(text);
      const ms = Math.round(performance.now() - start);

      pushLog({
        time: `${nowTime()} · ${ms}ms`,
        method,
        path,
        status,
        details: text ? text.slice(0, 500) : ""
      });

      return { status, text, data };
    } catch (e) {
      pushLog({ time: `${nowTime()}`, method, path, status: "ERR", details: String(e) });
      return { status: 0, text: String(e), data: null };
    }
  }

  // Nav
  function setActiveView(view) {
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const el = document.getElementById("view-" + view);
    if (el) el.classList.add("active");
  }
  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.addEventListener("click", () => setActiveView(btn.dataset.view));
  });

  // API Base & Token
  apiBaseInput.value = getApiBase();
  saveApiBaseBtn.addEventListener("click", () => {
    const v = apiBaseInput.value.trim();
    if (!v) return alert("API Base 不能为空");
    setApiBase(v);
    pushLog({ time: nowTime(), method: "INFO", path: "API Base set", status: "OK", details: v });
    alert("已保存 API Base: " + v);
  });
  logoutBtn.addEventListener("click", () => {
    setToken("");
    pushLog({ time: nowTime(), method: "AUTH", path: "logout", status: "OK", details: "" });
  });
  clearLogsBtn.addEventListener("click", () => {
    localStorage.removeItem(LS_LOGS);
    renderLogs();
  });

  // Health
  $("healthBtn").addEventListener("click", async () => {
    const r = await apiFetch("/health");
    $("healthResp").textContent = r.data ? pretty(r.data) : r.text;
  });

  // Auth
  $("registerBtn").addEventListener("click", async () => {
    const username = $("regUsername").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;
    if (!username || !email || !password) return alert("请填写完整注册信息");
    const r = await apiFetch("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password })
    });
    $("registerResp").textContent = r.data ? pretty(r.data) : r.text;
  });

  $("loginBtn").addEventListener("click", async () => {
    const identifier = $("loginIdentifier").value.trim();
    const password = $("loginPassword").value;
    if (!identifier || !password) return alert("请填写登录信息");

    const r = await apiFetch("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    });
    $("loginResp").textContent = r.data ? pretty(r.data) : r.text;

    // 兼容提取 token：{token} / {data:{token}} / {data:"..."}
    let t = "";
    const d = r.data;
    if (d) {
      if (typeof d.token === "string") t = d.token;
      else if (d.data && typeof d.data.token === "string") t = d.data.token;
      else if (typeof d.data === "string") t = d.data;
    }
    if (t) setToken(t);
  });

  $("profileBtn").addEventListener("click", async () => {
    const r = await apiFetch("/api/v1/profile");
    $("profileResp").textContent = r.data ? pretty(r.data) : r.text;
  });

  // Posts
  async function refreshPosts() {
    const r = await apiFetch("/api/v1/posts");
    $("postsListResp").textContent = r.data ? pretty(r.data) : r.text;

    const arr = Array.isArray(r.data?.data) ? r.data.data : Array.isArray(r.data) ? r.data : [];
    const list = $("postsList");
    list.innerHTML = "";
    if (!arr.length) {
      list.innerHTML = `<div class="muted" style="font-size:13px">暂无文章</div>`;
      return;
    }

    for (const p of arr) {
      const id = p.id ?? p.ID ?? "";
      const title = p.title ?? "(no title)";
      const uid = p.user_id ?? p.userID ?? p.UserID ?? "";
      const created = p.created_at ?? p.CreatedAt ?? "";

      const item = document.createElement("div");
      item.className = "post-item";
      item.innerHTML = `
        <div class="post-meta">
          <div class="post-title"><span class="badge">#${id}</span> ${escapeHtml(title)}</div>
          <div class="post-sub">user_id: ${escapeHtml(String(uid))} · created: ${escapeHtml(String(created).slice(0, 19))}</div>
        </div>
        <div class="post-actions">
          <button class="btn btn-outline btn-sm" data-act="detail" data-id="${id}">详情</button>
          <button class="btn btn-outline btn-sm" data-act="fill" data-id="${id}">填充编辑</button>
          <button class="btn btn-danger btn-sm" data-act="delete" data-id="${id}">删除</button>
        </div>
      `;
      list.appendChild(item);
    }

    list.querySelectorAll("button[data-act]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        if (!id) return;

        if (act === "detail") {
          $("postDetailId").value = id;
          await fetchPostDetail();
        } else if (act === "fill") {
          $("editId").value = id;
          const r2 = await apiFetch(`/api/v1/posts/${id}`);
          const d = r2.data?.data ?? r2.data;
          if (d) {
            $("editTitle").value = d.title ?? "";
            $("editContent").value = d.content ?? "";
          }
          $("postDetailResp").textContent = r2.data ? pretty(r2.data) : r2.text;
        } else if (act === "delete") {
          if (!confirm(`确认删除文章 #${id} ?`)) return;
          const r3 = await apiFetch(`/api/v1/posts/${id}`, { method: "DELETE" });
          $("editPostResp").textContent = r3.data ? pretty(r3.data) : r3.text;
          await refreshPosts();
        }
      });
    });
  }

  async function fetchPostDetail() {
    const id = $("postDetailId").value.trim();
    if (!id) return alert("请填写文章ID");
    const r = await apiFetch(`/api/v1/posts/${id}`);
    $("postDetailResp").textContent = r.data ? pretty(r.data) : r.text;
  }

  $("postsRefreshBtn").addEventListener("click", refreshPosts);
  $("postDetailBtn").addEventListener("click", fetchPostDetail);

  $("createPostBtn").addEventListener("click", async () => {
    const title = $("createTitle").value.trim();
    const content = $("createContent").value.trim();
    if (!title || !content) return alert("标题和内容不能为空");
    const r = await apiFetch("/api/v1/posts", {
      method: "POST",
      body: JSON.stringify({ title, content })
    });
    $("createPostResp").textContent = r.data ? pretty(r.data) : r.text;
    await refreshPosts();
  });

  $("updatePostBtn").addEventListener("click", async () => {
    const id = $("editId").value.trim();
    if (!id) return alert("请填写文章ID");
    const title = $("editTitle").value.trim();
    const content = $("editContent").value.trim();
    const payload = {};
    if (title) payload.title = title;
    if (content) payload.content = content;
    if (!Object.keys(payload).length) return alert("请至少填写一个字段（标题或内容）");

    const r = await apiFetch(`/api/v1/posts/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    $("editPostResp").textContent = r.data ? pretty(r.data) : r.text;
    await refreshPosts();
  });

  $("deletePostBtn").addEventListener("click", async () => {
    const id = $("editId").value.trim();
    if (!id) return alert("请填写文章ID");
    if (!confirm(`确认删除文章 #${id} ?`)) return;
    const r = await apiFetch(`/api/v1/posts/${id}`, { method: "DELETE" });
    $("editPostResp").textContent = r.data ? pretty(r.data) : r.text;
    await refreshPosts();
  });

  // Comments
  $("commentsFetchBtn").addEventListener("click", async () => {
    const postId = $("commentsPostId").value.trim();
    if (!postId) return alert("请填写文章ID");
    const r = await apiFetch(`/api/v1/comments/post/${postId}`);
    $("commentsListResp").textContent = r.data ? pretty(r.data) : r.text;
  });

  $("createCommentBtn").addEventListener("click", async () => {
    const postId = $("createCommentPostId").value.trim();
    const content = $("createCommentContent").value.trim();
    if (!postId || !content) return alert("文章ID与评论内容不能为空");
    const r = await apiFetch(`/api/v1/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify({ content })
    });
    $("createCommentResp").textContent = r.data ? pretty(r.data) : r.text;
  });

  // Console
  $("consoleSendBtn").addEventListener("click", async () => {
    const method = $("consoleMethod").value;
    const path = $("consolePath").value.trim();
    const body = $("consoleBody").value.trim();
    if (!path.startsWith("/")) return alert("路径请以 / 开头，如 /api/v1/posts");

    const opt = { method };
    if (body && method !== "GET") {
      const parsed = safeJsonParse(body);
      if (!parsed) return alert("Body 必须是合法 JSON");
      opt.body = JSON.stringify(parsed);
    }
    const r = await apiFetch(path, opt);
    $("consoleResp").textContent = r.data ? pretty(r.data) : r.text;
  });

  $("consoleClearBtn").addEventListener("click", () => {
    $("consoleResp").textContent = "";
    $("consoleBody").value = "";
  });

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // init
  updateTokenStatus();
  renderLogs();
  refreshPosts().catch(() => { });
})();
