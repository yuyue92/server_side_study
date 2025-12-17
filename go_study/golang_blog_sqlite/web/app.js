/* Vanilla JS API Tester for Golang Blog */
(() => {
  const $ = (sel) => document.querySelector(sel);

  const storage = {
    get(key, fallback=null){
      try { const v = localStorage.getItem(key); return v ?? fallback; } catch { return fallback; }
    },
    set(key, value){
      try { localStorage.setItem(key, value); } catch {}
    },
    del(key){
      try { localStorage.removeItem(key); } catch {}
    }
  };

  const state = {
    apiBase: storage.get("apiBase", "http://localhost:8080"),
    token: storage.get("token", ""),
    requestLog: []
  };

  function setText(el, text){ el.textContent = text ?? ""; }

  function pretty(obj){
    if (obj === undefined) return "";
    if (typeof obj === "string") return obj;
    try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
  }

  function normalizeBase(url){
    if (!url) return "http://localhost:8080";
    url = url.trim();
    // remove trailing slash
    return url.replace(/\/+$/,"");
  }

  function nowTime(){
    const d = new Date();
    const hh = String(d.getHours()).padStart(2,"0");
    const mm = String(d.getMinutes()).padStart(2,"0");
    const ss = String(d.getSeconds()).padStart(2,"0");
    return `${hh}:${mm}:${ss}`;
  }

  function pushLog(entry){
    state.requestLog.unshift(entry);
    state.requestLog = state.requestLog.slice(0, 20);
    renderLog();
  }

  function renderLog(){
    const box = $("#reqLog");
    box.innerHTML = "";
    for (const it of state.requestLog){
      const div = document.createElement("div");
      div.className = "log-item";
      const t = document.createElement("div");
      t.className = "t";
      t.textContent = `${it.time} · ${it.status} · ${it.method} ${it.path}`;
      const b = document.createElement("div");
      b.className = "b";
      b.textContent = it.note || "";
      div.appendChild(t);
      div.appendChild(b);
      box.appendChild(div);
    }
  }

  function tokenShort(){
    if (!state.token) return "未登录";
    return state.token.length > 24 ? `${state.token.slice(0, 10)}...${state.token.slice(-10)}` : state.token;
  }

  function updateTokenUI(){
    setText($("#tokenState"), tokenShort());
    $("#btnLogout").disabled = !state.token;
  }

  function setToken(token){
    state.token = token || "";
    if (state.token) storage.set("token", state.token);
    else storage.del("token");
    updateTokenUI();
  }

  function parseJsonSafe(txt){
    if (!txt) return null;
    try { return JSON.parse(txt); } catch { return null; }
  }

  function extractToken(respJson){
    // tolerant extraction for different backend response shapes
    if (!respJson) return "";
    if (typeof respJson === "string") return "";
    if (respJson.token && typeof respJson.token === "string") return respJson.token;
    const d = respJson.data;
    if (d && typeof d === "object" && d.token && typeof d.token === "string") return d.token;
    if (respJson.data && respJson.data.data && respJson.data.data.token) return respJson.data.data.token;
    return "";
  }

  async function apiFetch(method, path, body, authMode="auto"){
    const base = normalizeBase(state.apiBase);
    const url = `${base}${path.startsWith("/") ? "" : "/"}${path}`;

    const headers = { "Accept": "application/json" };
    const hasBody = body !== undefined && body !== null && method !== "GET" && method !== "DELETE";
    if (hasBody) headers["Content-Type"] = "application/json";

    const token = state.token;
    const shouldAuth =
      authMode === "force" ? true :
      authMode === "none" ? false :
      !!token;

    if (shouldAuth){
      if (!token && authMode === "force"){
        throw new Error("强制认证模式但当前没有 token，请先登录。");
      }
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (hasBody) options.body = JSON.stringify(body);

    let res, text, json;
    let status = 0;
    try{
      res = await fetch(url, options);
      status = res.status;
      text = await res.text();
      json = parseJsonSafe(text);
    }catch(err){
      pushLog({ time: nowTime(), method, path, status: "ERR", note: String(err?.message || err) });
      throw err;
    }

    const note = json ? (json.message || json.error || "") : (text?.slice(0, 120) || "");
    pushLog({ time: nowTime(), method, path, status, note });

    return { status, ok: res.ok, text, json };
  }

  function bindTabs(){
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        btn.classList.add("active");
        const tabId = btn.getAttribute("data-tab");
        document.getElementById(tabId).classList.add("active");
      });
    });
  }

  function getFormJSON(form){
    const data = {};
    new FormData(form).forEach((v, k) => data[k] = typeof v === "string" ? v : String(v));
    // trim strings
    for (const k of Object.keys(data)){
      if (typeof data[k] === "string") data[k] = data[k].trim();
    }
    return data;
  }

  function fillPostForms(postId){
    const idStr = String(postId);
    // detail
    const f1 = $("#formGetPost");
    f1.elements["id"].value = idStr;
    // update/delete
    const f2 = $("#formUpdatePost");
    f2.elements["id"].value = idStr;
    // comments
    $("#formListComments").elements["post_id"].value = idStr;
    $("#formCreateComment").elements["post_id"].value = idStr;
  }

  function renderPostsList(posts){
    const box = $("#postsList");
    box.innerHTML = "";
    if (!Array.isArray(posts) || posts.length === 0){
      const empty = document.createElement("div");
      empty.className = "muted small";
      empty.textContent = "暂无文章。你可以先登录后创建一篇文章。";
      box.appendChild(empty);
      return;
    }

    for (const p of posts){
      const id = p.id ?? p.ID ?? p.Id;
      const title = p.title ?? p.Title ?? "(无标题)";
      const userId = p.user_id ?? p.UserID ?? p.userId ?? "";
      const createdAt = p.created_at ?? p.CreatedAt ?? "";
      const item = document.createElement("div");
      item.className = "list-item";

      const left = document.createElement("div");
      left.className = "li-left";
      const t = document.createElement("div");
      t.className = "li-title";
      t.textContent = `#${id} · ${title}`;
      const m = document.createElement("div");
      m.className = "li-meta";
      m.textContent = `user_id=${userId}  created_at=${createdAt ? String(createdAt) : "-"}`;
      left.appendChild(t);
      left.appendChild(m);

      const actions = document.createElement("div");
      actions.className = "li-actions";

      const btnView = document.createElement("button");
      btnView.className = "btn";
      btnView.textContent = "详情";
      btnView.addEventListener("click", async () => {
        fillPostForms(id);
        await doGetPost(id);
        // switch to posts tab remains
      });

      const btnEdit = document.createElement("button");
      btnEdit.className = "btn";
      btnEdit.textContent = "填充编辑";
      btnEdit.addEventListener("click", () => {
        fillPostForms(id);
      });

      const btnDelete = document.createElement("button");
      btnDelete.className = "btn btn-danger";
      btnDelete.textContent = "删除";
      btnDelete.addEventListener("click", async () => {
        fillPostForms(id);
        await doDeletePost(id);
      });

      actions.appendChild(btnView);
      actions.appendChild(btnEdit);
      actions.appendChild(btnDelete);

      item.appendChild(left);
      item.appendChild(actions);
      item.addEventListener("click", (e) => {
        // avoid double-trigger when clicking buttons
        if (e.target.tagName === "BUTTON") return;
        fillPostForms(id);
      });

      box.appendChild(item);
    }
  }

  // ---- Actions ----
  async function doHealth(){
    const hint = $("#healthHint");
    hint.textContent = "请求中...";
    try{
      const r = await apiFetch("GET", "/health");
      setText($("#healthResp"), r.json ? pretty(r.json) : r.text);
      hint.textContent = r.ok ? "OK" : `HTTP ${r.status}`;
    }catch(err){
      hint.textContent = "失败";
      setText($("#healthResp"), String(err?.message || err));
    }
  }

  async function doRegister(payload){
    const r = await apiFetch("POST", "/api/v1/auth/register", payload, "none");
    setText($("#registerResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doLogin(payload){
    const r = await apiFetch("POST", "/api/v1/auth/login", payload, "none");
    setText($("#loginResp"), r.json ? pretty(r.json) : r.text);
    const tok = extractToken(r.json);
    if (r.ok && tok){
      setToken(tok);
    }
    return r;
  }

  async function doProfile(){
    const r = await apiFetch("GET", "/api/v1/profile", null, "force");
    setText($("#profileResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doListPosts(){
    const r = await apiFetch("GET", "/api/v1/posts", null, "none");
    setText($("#postsListResp"), r.json ? pretty(r.json) : r.text);
    // attempt extract array from response
    let list = null;
    if (Array.isArray(r.json)) list = r.json;
    else if (r.json && Array.isArray(r.json.data)) list = r.json.data;
    else if (r.json && r.json.data && Array.isArray(r.json.data.items)) list = r.json.data.items;
    else if (r.json && Array.isArray(r.json.posts)) list = r.json.posts;
    renderPostsList(list || []);
    return r;
  }

  async function doGetPost(id){
    const r = await apiFetch("GET", `/api/v1/posts/${id}`, null, "none");
    setText($("#postDetailResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doCreatePost(payload){
    const r = await apiFetch("POST", "/api/v1/posts", payload, "force");
    setText($("#createPostResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doUpdatePost(id, payload){
    const r = await apiFetch("PUT", `/api/v1/posts/${id}`, payload, "force");
    setText($("#updatePostResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doDeletePost(id){
    if (!confirm(`确认删除文章 #${id}？（需要作者权限）`)) return;
    const r = await apiFetch("DELETE", `/api/v1/posts/${id}`, null, "force");
    setText($("#updatePostResp"), r.json ? pretty(r.json) : r.text);
    // refresh list after delete
    await doListPosts();
    return r;
  }

  async function doListComments(postId){
    const r = await apiFetch("GET", `/api/v1/comments/post/${postId}`, null, "none");
    setText($("#listCommentsResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doCreateComment(postId, payload){
    const r = await apiFetch("POST", `/api/v1/posts/${postId}/comments`, payload, "force");
    setText($("#createCommentResp"), r.json ? pretty(r.json) : r.text);
    return r;
  }

  async function doCustomSend(){
    const method = $("#customMethod").value;
    let path = $("#customPath").value.trim();
    if (!path) path = "/health";
    const auth = $("#customAuth").value;
    const bodyText = $("#customBody").value.trim();

    let body = null;
    if (method !== "GET" && method !== "DELETE"){
      if (bodyText){
        const parsed = parseJsonSafe(bodyText);
        if (!parsed){
          setText($("#customResp"), "JSON Body 解析失败，请检查格式。");
          return;
        }
        body = parsed;
      }else{
        body = {}; // allow empty body for POST/PUT
      }
    }

    try{
      const r = await apiFetch(method, path, body, auth);
      setText($("#customResp"), r.json ? pretty(r.json) : r.text);
    }catch(err){
      setText($("#customResp"), String(err?.message || err));
    }
  }

  async function doSmoke(){
    const hint = $("#smokeHint");
    hint.textContent = "冒烟测试中...";
    try{
      const r1 = await apiFetch("GET", "/health", null, "none");
      const r2 = await apiFetch("GET", "/api/v1/posts", null, "none");
      hint.textContent = `完成：/health=${r1.status}, /posts=${r2.status}`;
      setText($("#customResp"), pretty({ health: r1.json || r1.text, posts: r2.json || r2.text }));
    }catch(err){
      hint.textContent = "失败（检查后端是否启动/是否 CORS）";
      setText($("#customResp"), String(err?.message || err));
    }
  }

  // ---- Bind UI ----
  function bindUI(){
    // base url
    $("#apiBase").value = state.apiBase;
    $("#btnSaveBase").addEventListener("click", () => {
      state.apiBase = normalizeBase($("#apiBase").value);
      storage.set("apiBase", state.apiBase);
      pushLog({ time: nowTime(), method: "-", path: "-", status: "INFO", note: `API Base set to ${state.apiBase}` });
    });

    // logout
    $("#btnLogout").addEventListener("click", () => {
      setToken("");
      setText($("#profileResp"), "");
      pushLog({ time: nowTime(), method:"-", path:"-", status:"INFO", note:"Logged out" });
    });

    // health
    $("#btnHealth").addEventListener("click", doHealth);

    // register
    $("#formRegister").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = getFormJSON(e.target);
      await doRegister(payload);
    });

    // login
    $("#formLogin").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = getFormJSON(e.target);
      await doLogin(payload);
    });

    $("#btnProfile").addEventListener("click", doProfile);

    // posts
    $("#btnListPosts").addEventListener("click", doListPosts);

    $("#formGetPost").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = e.target.elements["id"].value;
      await doGetPost(id);
    });

    $("#formCreatePost").addEventListener("submit", async (e) => {
      e.preventDefault();
      const payload = getFormJSON(e.target);
      await doCreatePost(payload);
      await doListPosts();
    });

    $("#formUpdatePost").addEventListener("submit", async (e) => {
      e.preventDefault();
      const id = e.target.elements["id"].value;
      const title = e.target.elements["title"].value.trim();
      const content = e.target.elements["content"].value.trim();
      const payload = {};
      if (title) payload.title = title;
      if (content) payload.content = content;
      if (Object.keys(payload).length === 0){
        setText($("#updatePostResp"), "请至少填写 title 或 content 之一用于更新。");
        return;
      }
      await doUpdatePost(id, payload);
      await doListPosts();
    });

    $("#btnDeletePost").addEventListener("click", async () => {
      const id = $("#formUpdatePost").elements["id"].value;
      if (!id) { alert("请先填写文章 ID"); return; }
      await doDeletePost(id);
    });

    // comments
    $("#formListComments").addEventListener("submit", async (e) => {
      e.preventDefault();
      const postId = e.target.elements["post_id"].value;
      await doListComments(postId);
    });

    $("#formCreateComment").addEventListener("submit", async (e) => {
      e.preventDefault();
      const postId = e.target.elements["post_id"].value;
      const payload = getFormJSON(e.target);
      // backend expects only content in body
      await doCreateComment(postId, { content: payload.content });
      await doListComments(postId);
    });

    // console
    $("#btnCustomSend").addEventListener("click", doCustomSend);
    $("#btnRunSmoke").addEventListener("click", doSmoke);
  }

  function init(){
    bindTabs();
    bindUI();
    updateTokenUI();
    // initial log
    pushLog({ time: nowTime(), method:"-", path:"-", status:"INFO", note:`Loaded. API Base=${state.apiBase}` });
  }

  window.addEventListener("DOMContentLoaded", init);
})();
