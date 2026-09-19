/* =========================================================
   admin.js — WordPress 风格博客编辑器（Vditor + GitHub Contents API）
   口令门（前端比对，防误入） + fine-grained PAT（实际写 GitHub）
   特性：三栏布局 / 草稿·发布 / 图片上传到 assets / 修订历史+回滚 / 本地自动保存 / 站点样式预览
   ========================================================= */
(function () {
  "use strict";

  // ---------- 配置 ----------
  const OWNER = "lotusor", REPO = "lotusor.github.io", BRANCH = "main";
  const DATA_PATH = "content/posts.json";
  const SITE_ORIGIN = "https://lotusor.github.io";
  const API = "https://api.github.com";
  const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  const PASS_HASH = "9de6d2444e21aa89981ff0e5893640d3783b7652b4eaafe88687cadeba95db8c"; // sha256(口令)，见运维指南 §14 轮换方法
  const AUTH_KEY = "lotusor-admin-auth";       // sessionStorage：本次口令会话
  const PAT_KEY = "lotusor-admin-pat";        // localStorage：记住的 PAT
  const AUTOSAVE_KEY = "lotusor-admin-autosave";
  const EXPECTED_BUILD = "4";               // 与 index.html 的 data-admin-build 对应，用于版本握手

  // ---------- DOM ----------
  const $ = (id) => document.getElementById(id);
  const gate = $("gate"), gateForm = $("gateForm"), gateInput = $("gateInput"), gateErr = $("gateErr");
  const app = $("app"), connDot = $("connDot");
  const connectBar = $("connectBar"), patInput = $("pat"), remember = $("remember"), connHint = $("connHint");
  const statusEl = $("status");
  const postListEl = $("postList"), postCountEl = $("postCount"), searchList = $("searchList");
  const editorEmpty = $("editorEmpty"), vditorHost = $("vditor");
  const sidePane = $("sidePane");
  const fId = $("f_id"), fTitle = $("f_title"), fDate = $("f_date"), fTags = $("f_tags"), fExcerpt = $("f_excerpt"), fStatus = $("f_status");
  const idHint = $("idHint"), autosaveTip = $("autosaveTip");

  // 版本错配防护：浏览器若缓存了旧版 index.html（缺关键 DOM，或 build 号不匹配），给出明确提示而非白屏报错
  if (!gate || !app || !$("sidePane") || document.body.getAttribute("data-admin-build") !== EXPECTED_BUILD) {
    document.body.innerHTML = '<div style="font-family:system-ui,-apple-system,sans-serif;padding:48px;text-align:center;color:#33414f;line-height:1.8">'
      + '<h3 style="margin:0 0 10px">检测到旧版本缓存</h3>'
      + '页面组件与脚本版本不匹配，请<strong>强制刷新</strong>后重试：<br>'
      + 'Windows / Linux：Ctrl + Shift + R　·　Mac：Cmd + Shift + R</div>';
    return;
  }

  // ---------- 状态 ----------
  let posts = [];
  let fileSha = null;
  let current = -1;        // 编辑索引；-1 新建
  let vd = null;           // Vditor 实例
  let connected = false;
  let autosaveTimer = null;
  let vdReady = false;         // Vditor 异步初始化完成标志
  let pendingContent = null;   // 就绪前待写入的正文
  let pendingInsert = null;    // 就绪前待插入的片段（媒体库/图片）

  // ---------- 工具 ----------
  function b64decode(b64) { const bin = atob(b64.replace(/\s+/g, "")); const by = Uint8Array.from(bin, c => c.charCodeAt(0)); return new TextDecoder("utf-8").decode(by); }
  function b64encode(str) { const by = new TextEncoder().encode(str); let bin = ""; const CH = 0x8000; for (let i = 0; i < by.length; i += CH) bin += String.fromCharCode.apply(null, by.subarray(i, i + CH)); return btoa(bin); }
  function fileToB64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1]); r.onerror = rej; r.readAsDataURL(file); }); }
  function token() { return (patInput.value || "").trim(); }
  function setStatus(m, k) { statusEl.textContent = m || ""; statusEl.className = "status" + (k ? " " + k : ""); }
  function httpHint(s) { return { 401: "401 未授权：PAT 无效/权限不足（需 Contents 读写）", 403: "403 禁止：速率限制或权限不足", 404: "404 未找到：路径/分支?", 409: "409 冲突：远端已变动，请重新「连接并加载」" }[s] || ("HTTP " + s); }
  async function sha256hex(str) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str)); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""); }
  function ghHeaders(auth) { const h = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }; if (auth) h["Authorization"] = "Bearer " + token(); return h; }
  function fetchTimeout(url, opts, ms) {
    ms = ms || 12000;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, Object.assign({}, opts, { signal: ctrl.signal })).finally(() => clearTimeout(timer))
      .catch(err => { if (err && err.name === "AbortError") throw new Error("请求超时（网络或 GitHub API 无响应），请重试"); throw err; });
  }
  function openOnlyModal(modal) { document.querySelectorAll(".modal").forEach(m => { if (m !== modal) m.hidden = true; }); modal.hidden = false; }

  // ---------- 口令门 ----------
  async function tryUnlock(pass) {
    const h = await sha256hex(pass);
    if (h === PASS_HASH) { sessionStorage.setItem(AUTH_KEY, "1"); enterApp(); return true; }
    return false;
  }
  function showGate() { gate.hidden = false; app.hidden = true; }
  function enterApp() { gate.hidden = true; app.hidden = false; if (connected) return; initPat(); }

  gateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    gateErr.textContent = "";
    const ok = await tryUnlock(gateInput.value);
    if (!ok) gateErr.textContent = "口令不正确";
  });
  $("lockBtn").addEventListener("click", () => { sessionStorage.removeItem(AUTH_KEY); location.reload(); });

  // ---------- GitHub 连接 ----------
  function initPat() {
    const saved = localStorage.getItem(PAT_KEY);
    if (saved) { patInput.value = saved; remember.checked = true; doConnect(); }
    else { connectBar.hidden = false; connHint.textContent = "填入 PAT 后连接以开始编辑。"; }
  }
  $("ghBtn").addEventListener("click", () => { connectBar.hidden = !connectBar.hidden; });
  $("connectBtn").addEventListener("click", () => {
    if (remember.checked && token()) localStorage.setItem(PAT_KEY, token()); else localStorage.removeItem(PAT_KEY);
    doConnect();
  });
  $("forgetBtn").addEventListener("click", () => { localStorage.removeItem(PAT_KEY); patInput.value = ""; connected = false; connDot.classList.remove("on"); setStatus("已清除本机 PAT。", "info"); });

  async function doConnect() {
    if (!token()) { connectBar.hidden = false; connHint.textContent = "请先填入 PAT。"; return; }
    setStatus("连接 GitHub…", "info");
    try {
      const res = await fetchTimeout(`${API}/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`, { headers: ghHeaders(true) });
      if (res.status === 404) { posts = []; fileSha = null; }
      else if (!res.ok) throw new Error(httpHint(res.status));
      else { const d = await res.json(); fileSha = d.sha; posts = JSON.parse(b64decode(d.content)); }
      connected = true; connDot.classList.add("on"); connectBar.hidden = true;
      setStatus(`已连接，载入 ${posts.length} 篇文章。`, "ok");
      renderList();
    } catch (e) { setStatus("连接失败：" + e.message, "err"); connectBar.hidden = false; }
  }

  // ---------- 列表 ----------
  function renderList() {
    const q = (searchList.value || "").trim().toLowerCase();
    const rows = posts.map((p, idx) => ({ p, idx }))
      .filter(({ p }) => !q || (p.title || "").toLowerCase().includes(q) || (p.tags || []).join(",").toLowerCase().includes(q))
      .sort((a, b) => String(b.p.date).localeCompare(String(a.p.date)));
    postCountEl.textContent = String(posts.length);
    postListEl.innerHTML = "";
    rows.forEach(({ p, idx }) => {
      const li = document.createElement("li"); li.dataset.idx = String(idx);
      if (idx === current) li.classList.add("active");
      const t = document.createElement("span"); t.className = "t";
      t.textContent = p.title || "(无标题)";
      if (p.status === "draft") { const b = document.createElement("span"); b.className = "badge"; b.textContent = "草稿"; t.appendChild(b); }
      const d = document.createElement("span"); d.className = "d"; d.textContent = `${p.date || ""} · ${p.id || ""}`;
      li.appendChild(t); li.appendChild(d);
      li.addEventListener("click", () => select(idx));
      postListEl.appendChild(li);
    });
  }
  searchList.addEventListener("input", renderList);

  // ---------- Vditor ----------
  function ensureVditor() {
    if (vd) return;
    vditorHost.hidden = false; editorEmpty.hidden = true;
    const isDark = !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
    vd = new Vditor("vditor", {
      cdn: "https://registry.npmmirror.com/vditor/3.11.2/files",
      mode: "ir",
      lang: "zh_CN",
      theme: isDark ? "dark" : "classic",
      height: Math.max(420, window.innerHeight - 210),
      minHeight: 360,
      icon: "ant",
      cache: { enable: false },
      preview: { hljs: { style: isDark ? "github-dark" : "github", enable: true } },
      toolbar: [
        "headings", "bold", "italic", "strike", "|", "list", "ordered-list", "check", "|",
        "quote", "code", "inline-code", "link", "upload", "table", "|", "undo", "redo", "|",
        "edit-mode", "outline", "preview", "fullscreen",
      ],
      upload: { multiple: true, accept: "image/*", handler: onUpload },
      input: () => scheduleAutosave(),
      after: () => { vdReady = true; if (pendingContent !== null) { vd.setValue(pendingContent); pendingContent = null; } if (pendingInsert !== null) { vd.insertValue(pendingInsert); pendingInsert = null; } },
    });
  }
  function setEditorContent(md) { if (vdReady && vd) vd.setValue(md || ""); else pendingContent = md || ""; }
  function getEditorContent() { return (vdReady && vd) ? vd.getValue() : (pendingContent || ""); }

  async function uploadImageToAssets(f) {
    const ext = ((f.name.split(".").pop() || "png").toLowerCase()).replace(/[^a-z0-9]/g, "") || "png";
    const name = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const path = `assets/${name}`;
    const b64 = await fileToB64(f);
    await ghPut(path, b64, `assets: 上传图片 ${name}`);
    return { name, url: `${SITE_ORIGIN}/${path}` };
  }

  async function onUpload(files) {
    if (!connected) { setStatus("请先连接 GitHub 再上传图片。", "err"); return; }
    for (const f of files) {
      try {
        const { name, url } = await uploadImageToAssets(f);
        const alt = f.name.replace(/\.[^.]+$/, "") || name;
        if (vdReady && vd) vd.insertValue(`![${alt}](${url})\n`); else pendingInsert = (pendingInsert || "") + `![${alt}](${url})\n`;
        setStatus(`图片已上传：${name}`, "ok");
      } catch (e) { setStatus("图片上传失败：" + e.message, "err"); }
    }
  }

  // ---------- 选择 / 新建 ----------
  function select(idx) {
    current = idx; const p = posts[idx];
    sidePane.hidden = false;
    ensureVditor();
    fId.value = p.id || ""; fId.readOnly = true; idHint.textContent = "（已有文章，改 id 会使旧链接失效）"; idHint.classList.remove("bad");
    fDate.value = p.date || ""; fTags.value = (p.tags || []).join(", "); fExcerpt.value = p.excerpt || ""; fStatus.value = p.status === "draft" ? "draft" : "published";
    setEditorContent(p.content || "");
    renderList();
    checkAutosave(p.id);
  }
  function newPost() {
    current = -1; sidePane.hidden = false; ensureVditor();
    fId.value = ""; fId.readOnly = false; idHint.textContent = ""; idHint.classList.remove("bad");
    fDate.value = new Date().toISOString().slice(0, 10); fTags.value = ""; fExcerpt.value = ""; fStatus.value = "draft";
    setEditorContent("");
    renderList(); fId.focus(); autosaveTip.textContent = "";
  }
  $("newBtn").addEventListener("click", newPost);

  // ---------- 收集 / 校验 ----------
  function collect() {
    return {
      id: fId.value.trim(), title: fTitle.value.trim(), date: fDate.value.trim(),
      tags: fTags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      excerpt: fExcerpt.value.trim(), content: getEditorContent(),
      status: fStatus.value === "draft" ? "draft" : "published",
    };
  }
  function validate(p) {
    if (!p.title) return "标题不能为空";
    if (!p.id) return "id 不能为空";
    if (!ID_RE.test(p.id)) return "id 只能小写字母/数字/短横线";
    if (current === -1 && posts.some(x => x.id === p.id)) return "id 已存在";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "日期格式 YYYY-MM-DD";
    return null;
  }

  // ---------- 保存 ----------
  async function save(asDraft) {
    if (!connected) { setStatus("请先连接 GitHub。", "err"); connectBar.hidden = false; return; }
    if (asDraft) fStatus.value = "draft";
    const p = collect();
    const err = validate(p);
    if (err) { setStatus("校验未通过：" + err, "err"); return; }
    if (current === -1) { posts.push(p); current = posts.length - 1; }
    else { posts[current] = p; }
    setStatus("提交中…", "info");
    try {
      await commitPosts(JSON.stringify(posts, null, 2) + "\n", `content: ${p.status === "draft" ? "草稿" : "更新"}《${p.title}》(${p.id})`);
      renderList(); clearAutosave();
      setStatus(`已保存到 main（${p.status === "draft" ? "草稿" : "已发布"}）。Pages 约 1–2 分钟生效。`, "ok");
    } catch (e) { setStatus("保存失败：" + e.message, "err"); }
  }
  $("saveBtn").addEventListener("click", () => save(false));
  $("saveDraftBtn").addEventListener("click", () => save(true));

  async function commitPosts(text, message) {
    const body = { message, content: b64encode(text), branch: BRANCH };
    if (fileSha) body.sha = fileSha;
    const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`, { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders(true)), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(httpHint(res.status));
    const d = await res.json(); fileSha = d.content && d.content.sha;
  }
  async function ghPut(path, b64content, message) {
    let sha;
    const g = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`, { headers: ghHeaders(true) });
    if (g.ok) sha = (await g.json()).sha;
    const body = { message, content: b64content, branch: BRANCH }; if (sha) body.sha = sha;
    const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, { method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, ghHeaders(true)), body: JSON.stringify(body) });
    if (!res.ok) throw new Error(httpHint(res.status));
    return res.json();
  }

  function del() {
    if (current < 0) return; const p = posts[current];
    if (!confirm(`确认删除《${p.title}》(${p.id})？\n（需点“保存到 GitHub”才会真正提交删除。）`)) return;
    posts.splice(current, 1); current = -1; sidePane.hidden = true; setEditorContent("");
    renderList(); autosaveTip.textContent = "";
    setStatus("已从列表删除，记得点“保存到 GitHub”提交。", "info");
  }
  $("delBtn").addEventListener("click", del);

  // ---------- 自动保存 ----------
  function scheduleAutosave() { clearTimeout(autosaveTimer); autosaveTimer = setTimeout(doAutosave, 800); }
  function doAutosave() {
    if (current < 0 && !fId.value && !fTitle.value && !getEditorContent()) return;
    const key = (current >= 0 ? posts[current].id : (fId.value.trim() || "__new__"));
    try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify({ key, fields: { id: fId.value, date: fDate.value, tags: fTags.value, excerpt: fExcerpt.value, status: fStatus.value, title: fTitle.value }, content: getEditorContent(), ts: Date.now() })); autosaveTip.textContent = "已本地自动保存 " + new Date().toLocaleTimeString(); } catch (_) {}
  }
  function checkAutosave(id) {
    let a; try { a = JSON.parse(localStorage.getItem(AUTOSAVE_KEY)); } catch (_) { a = null; }
    if (a && a.key === id) {
      autosaveTip.textContent = "";
      autosaveTip.appendChild(document.createTextNode(`检测到未保存草稿（${new Date(a.ts).toLocaleString()}） `));
      const r = document.createElement("button"); r.className = "btn small"; r.textContent = "恢复";
      r.onclick = () => { fId.value = a.fields.id; fDate.value = a.fields.date; fTags.value = a.fields.tags; fExcerpt.value = a.fields.excerpt; fStatus.value = a.fields.status; fTitle.value = a.fields.title; setEditorContent(a.content || ""); autosaveTip.textContent = "已恢复本地草稿"; };
      const x = document.createElement("button"); x.className = "btn small ghost"; x.textContent = "丢弃"; x.style.marginLeft = "6px"; x.onclick = () => { clearAutosave(); autosaveTip.textContent = ""; };
      autosaveTip.appendChild(r); autosaveTip.appendChild(x);
    } else autosaveTip.textContent = "";
  }
  function clearAutosave() { try { localStorage.removeItem(AUTOSAVE_KEY); } catch (_) {} }
  [fTitle, fId, fDate, fTags, fExcerpt, fStatus].forEach(el => el.addEventListener("input", scheduleAutosave));
  fId.addEventListener("input", () => { if (current === -1) { const v = fId.value.trim(); if (v && !ID_RE.test(v)) { idHint.textContent = "只允许小写字母/数字/短横线"; idHint.classList.add("bad"); } else if (v && posts.some(x => x.id === v)) { idHint.textContent = "该 id 已存在"; idHint.classList.add("bad"); } else { idHint.textContent = ""; idHint.classList.remove("bad"); } } });

  // ---------- 修订历史 + 回滚 ----------
  const revModal = $("revisionsModal"), revBody = $("revisionsBody");
  $("revisionsBtn").addEventListener("click", openRevisions);
  async function openRevisions() {
    if (!connected) { setStatus("请先连接 GitHub。", "err"); return; }
    openOnlyModal(revModal); revBody.innerHTML = '<p class="muted">加载历史…</p>';
    try {
      const res = await fetchTimeout(`${API}/repos/${OWNER}/${REPO}/commits?path=${encodeURIComponent(DATA_PATH)}&sha=${BRANCH}&per_page=20`, { headers: ghHeaders(true) });
      if (!res.ok) throw new Error(httpHint(res.status));
      const list = await res.json();
      if (!list.length) { revBody.innerHTML = '<p class="muted">暂无历史。</p>'; return; }
      revBody.innerHTML = "";
      list.forEach(c => {
        const row = document.createElement("div"); row.className = "rev-row";
        const meta = document.createElement("div"); meta.className = "meta";
        const msg = document.createElement("div"); msg.className = "msg"; msg.textContent = (c.commit.message || "").split("\n")[0];
        const sub = document.createElement("div"); sub.className = "sub"; sub.textContent = `${new Date(c.commit.author.date).toLocaleString()} · ${c.commit.author.name} · `;
        const sha = document.createElement("span"); sha.className = "sha"; sha.textContent = c.sha.slice(0, 7); sub.appendChild(sha);
        meta.appendChild(msg); meta.appendChild(sub);
        const view = document.createElement("button"); view.className = "btn small"; view.textContent = "查看/恢复";
        view.onclick = () => viewRevision(c.sha);
        row.appendChild(meta); row.appendChild(view); revBody.appendChild(row);
      });
    } catch (e) { revBody.innerHTML = `<p class="muted" style="color:var(--danger)">${e.message}</p>`; }
  }
  async function viewRevision(sha) {
    revBody.innerHTML = '<p class="muted">加载该版本…</p>';
    try {
      const res = await fetchTimeout(`${API}/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${sha}`, { headers: ghHeaders(true) });
      if (!res.ok) throw new Error(httpHint(res.status));
      const old = JSON.parse(b64decode((await res.json()).content));
      const curIds = new Set(posts.map(p => p.id)), oldIds = new Set(old.map(p => p.id));
      const added = [...oldIds].filter(x => !curIds.has(x)), removed = [...curIds].filter(x => !oldIds.has(x));
      revBody.innerHTML = "";
      const bar = document.createElement("div"); bar.className = "rev-row";
      const info = document.createElement("div"); info.className = "meta";
      info.innerHTML = `<div class="msg">该版本共 ${old.length} 篇</div><div class="sub">相对当前：此版本独有 ${added.length} 篇，当前独有 ${removed.length} 篇</div>`;
      const restore = document.createElement("button"); restore.className = "btn primary small"; restore.textContent = "恢复整个 posts.json 到此版本";
      restore.onclick = async () => {
        if (!confirm("将用该历史版本整体覆盖当前 posts.json（会提交一次）。确认？")) return;
        setStatus("回滚中…", "info");
        try { await commitPosts(JSON.stringify(old, null, 2) + "\n", `revert: content/posts.json → ${sha.slice(0, 7)}`); posts = old; renderList(); setStatus("已回滚到 " + sha.slice(0, 7), "ok"); revModal.hidden = true; }
        catch (e) { setStatus("回滚失败：" + e.message, "err"); }
      };
      bar.appendChild(info); bar.appendChild(restore); revBody.appendChild(bar);
      const ul = document.createElement("ul"); ul.style.cssText = "margin:8px 0 0;padding-left:18px;color:var(--text-dim);font-size:13px";
      old.forEach(p => { const li = document.createElement("li"); li.textContent = `${p.date} · ${p.title}`; if (added.includes(p.id)) li.style.color = "var(--ok)"; ul.appendChild(li); });
      revBody.appendChild(ul);
    } catch (e) { revBody.innerHTML = `<p class="muted" style="color:var(--danger)">${e.message}</p>`; }
  }

  // ---------- 媒体库 ----------
  const mediaModal = $("mediaModal"), mediaGrid = $("mediaGrid"), mediaUpload = $("mediaUpload");
  const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
  function fmtSize(b) { return b < 1024 ? b + " B" : b < 1048576 ? (b / 1024).toFixed(0) + " KB" : (b / 1048576).toFixed(1) + " MB"; }
  function insertImageMd(md) { ensureVditor(); if (vdReady && vd) vd.insertValue(md); else pendingInsert = (pendingInsert || "") + md; }
  async function openMediaLibrary() {
    if (!connected) { setStatus("请先连接 GitHub。", "err"); connectBar.hidden = false; return; }
    ensureVditor(); openOnlyModal(mediaModal); loadMediaGrid();
  }
  async function loadMediaGrid() {
    mediaGrid.innerHTML = '<p class="muted">读取 assets/ …</p>';
    try {
      const res = await fetchTimeout(`${API}/repos/${OWNER}/${REPO}/contents/assets`, { headers: ghHeaders(true) });
      if (res.status === 404) { mediaGrid.innerHTML = '<p class="muted">assets/ 目录为空。</p>'; return; }
      if (!res.ok) throw new Error(httpHint(res.status));
      const items = (await res.json()).filter(x => x.type === "file" && IMG_RE.test(x.name)).sort((a, b) => a.name.localeCompare(b.name));
      if (!items.length) { mediaGrid.innerHTML = '<p class="muted">还没有图片，点「上传图片」。</p>'; return; }
      mediaGrid.innerHTML = "";
      items.forEach(it => {
        const url = `${SITE_ORIGIN}/${it.path}`;
        const card = document.createElement("button"); card.type = "button"; card.className = "media-item"; card.title = `${it.name} · ${fmtSize(it.size)}`;
        card.innerHTML = `<img loading="lazy" src="${url}" alt=""><span class="mi-name">${escapeHtml(it.name)}</span><span class="mi-size">${fmtSize(it.size)}</span>`;
        card.addEventListener("click", () => { const alt = it.name.replace(/\.[^.]+$/, ""); insertImageMd(`![${alt}](${url})\n`); setStatus("已插入：" + it.name, "ok"); mediaModal.hidden = true; });
        mediaGrid.appendChild(card);
      });
    } catch (e) { mediaGrid.innerHTML = `<p class="muted" style="color:var(--danger)">${e.message}（点右上「刷新」重试）</p>`; }
  }
  if ($("mediaBtn")) $("mediaBtn").addEventListener("click", openMediaLibrary);
  if ($("mediaRefresh")) $("mediaRefresh").addEventListener("click", loadMediaGrid);
  if (mediaUpload) mediaUpload.addEventListener("change", async (e) => {
    const files = [...e.target.files]; e.target.value = "";
    if (!files.length) return;
    for (const f of files) { try { const { name } = await uploadImageToAssets(f); setStatus("已上传 " + name, "ok"); } catch (er) { setStatus("上传失败：" + er.message, "err"); } }
    loadMediaGrid();
  });

  // ---------- 站点样式预览 ----------
  const pvModal = $("previewModal"), pvFrame = $("previewFrame");
  $("previewBtn").addEventListener("click", openPreview);
  function openPreview() {
    const p = collect();
    const bodyHtml = (window.marked ? marked.parse(p.content || "") : (p.content || ""));
    const safe = window.DOMPurify ? DOMPurify.sanitize(bodyHtml) : bodyHtml;
    const isDark = !window.matchMedia || window.matchMedia("(prefers-color-scheme: dark)").matches;
    const doc = `<!DOCTYPE html><html lang="zh-CN" data-theme="${isDark ? "dark" : "light"}"><head><meta charset="utf-8">
      <link rel="stylesheet" href="../styles.css"><link rel="stylesheet" href="../landing.css"><link rel="stylesheet" href="../light.css">
      <link rel="stylesheet" href="https://registry.npmmirror.com/@highlightjs/cdn-assets/11.9.0/files/styles/${isDark ? "github-dark" : "github"}.min.css">
      <style>body{padding-bottom:40px}</style></head>
      <body class="on-blog"><main id="app"><article class="article"><header class="article-header"><h1>${escapeHtml(p.title || "(无标题)")}</h1>
      <div class="post-meta"><span>📅 ${escapeHtml(p.date)}</span><span>🏷 ${(p.tags || []).map(escapeHtml).join(" · ")}</span></div></header>
      <div class="article-body">${safe}</div></article></main>
      <script src="https://registry.npmmirror.com/@highlightjs/cdn-assets/11.9.0/files/highlight.min.js"><\/script>
      <script>try{document.querySelectorAll('.article-body pre code').forEach(b=>hljs.highlightElement(b));}catch(e){}<\/script>
      </body></html>`;
    openOnlyModal(pvModal); pvFrame.srcdoc = doc;
  }
  function escapeHtml(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  // ---------- 弹窗关闭 ----------
  document.querySelectorAll(".modal").forEach(m => m.addEventListener("click", (e) => { if (e.target === m || (e.target.matches && e.target.matches("[data-close]"))) m.hidden = true; }));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") document.querySelectorAll(".modal").forEach(m => m.hidden = true); });

  // ---------- 启动 ----------
  if (sessionStorage.getItem(AUTH_KEY) === "1") enterApp(); else showGate();
})();
