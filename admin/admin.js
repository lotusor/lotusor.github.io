/* =========================================================
   admin.js — 纯前端文章编辑器（GitHub Contents API + PAT）
   读写仓库内 content/posts.json；保存即向 main 分支提交一次。
   安全：PAT 仅在本机使用；勾选“记住”才存 localStorage。
   ========================================================= */
(function () {
  "use strict";

  const OWNER = "lotusor";
  const REPO = "lotusor.github.io";
  const BRANCH = "main";
  const DATA_PATH = "content/posts.json";
  const API = "https://api.github.com";
  const PAT_KEY = "lotusor-admin-pat";
  const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  // ---- DOM ----
  const $ = (id) => document.getElementById(id);
  const patInput = $("pat"), remember = $("remember");
  const statusEl = $("status");
  const postListEl = $("postList"), postCountEl = $("postCount");
  const editPane = $("editPane"), emptyPane = $("emptyPane");
  const fId = $("f_id"), fTitle = $("f_title"), fDate = $("f_date"), fTags = $("f_tags"), fExcerpt = $("f_excerpt"), fContent = $("f_content");
  const idHint = $("idHint"), dirty = $("dirty");
  const preview = $("preview"), previewToggle = $("previewToggle");

  let posts = [];      // 当前编辑中的文章数组
  let fileSha = null;  // Contents API 的 sha（提交乐观锁）
  let current = -1;    // 正在编辑的索引；-1 表示新建
  let isDirty = false;

  // ---- base64（UTF-8 安全） ----
  function b64decode(b64) {
    const bin = atob(b64.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  }
  function b64encode(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function token() { return (patInput.value || "").trim(); }
  function headers(withAuth) {
    const h = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (withAuth) h["Authorization"] = "Bearer " + token();
    return h;
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || "";
    statusEl.className = "status" + (kind ? " " + kind : "");
  }

  // ---- 加载 ----
  async function load() {
    if (!token()) { setStatus("请先填入 PAT。", "err"); return; }
    setStatus("加载中…", "info");
    try {
      const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${DATA_PATH}?ref=${BRANCH}`, { headers: headers(true) });
      if (res.status === 404) {
        // 远端还没有该文件：以站点当前数据为初值，保存时新建
        posts = []; fileSha = null;
        setStatus("远端暂无 posts.json，将从空开始（保存时创建）。", "info");
      } else if (!res.ok) {
        throw new Error(httpHint(res.status));
      } else {
        const data = await res.json();
        fileSha = data.sha;
        posts = JSON.parse(b64decode(data.content));
        setStatus(`已加载 ${posts.length} 篇文章。`, "ok");
      }
      renderList();
      showEmpty();
    } catch (e) {
      setStatus("加载失败：" + e.message, "err");
    }
  }

  function httpHint(s) {
    if (s === 401) return "401 未授权：PAT 无效/过期或权限不足（需 Contents 读写）。";
    if (s === 403) return "403 禁止：可能是速率限制或 PAT 权限不足。";
    if (s === 404) return "404 未找到：仓库/路径/分支是否正确？";
    if (s === 409) return "409 冲突：远端已被改动，请重新「连接并加载」后再保存。";
    return "HTTP " + s;
  }

  // ---- 列表 ----
  function renderList() {
    postCountEl.textContent = String(posts.length);
    postListEl.innerHTML = "";
    posts
      .map((p, idx) => ({ p, idx }))
      .sort((a, b) => String(b.p.date).localeCompare(String(a.p.date)))
      .forEach(({ p, idx }) => {
        const li = document.createElement("li");
        li.dataset.idx = String(idx);
        if (idx === current) li.classList.add("active");
        const t = document.createElement("span"); t.className = "t"; t.textContent = p.title || "(无标题)";
        const d = document.createElement("span"); d.className = "d"; d.textContent = `${p.date || ""} · ${p.id || ""}`;
        li.appendChild(t); li.appendChild(d);
        li.addEventListener("click", () => select(idx));
        postListEl.appendChild(li);
      });
  }

  function showEmpty() { editPane.hidden = true; emptyPane.hidden = false; }

  function select(idx) {
    current = idx;
    const p = posts[idx];
    fId.value = p.id || ""; fTitle.value = p.title || ""; fDate.value = p.date || "";
    fTags.value = (p.tags || []).join(", "); fExcerpt.value = p.excerpt || ""; fContent.value = p.content || "";
    fId.readOnly = true; idHint.textContent = "（已有文章，id 不建议改动，否则旧链接失效）"; idHint.classList.remove("bad");
    editPane.hidden = false; emptyPane.hidden = true;
    setDirty(false); hidePreview();
    renderList();
  }

  function newPost() {
    current = -1;
    fId.value = ""; fTitle.value = ""; fDate.value = new Date().toISOString().slice(0, 10);
    fTags.value = ""; fExcerpt.value = ""; fContent.value = "";
    fId.readOnly = false; idHint.textContent = ""; idHint.classList.remove("bad");
    editPane.hidden = false; emptyPane.hidden = true;
    setDirty(true); hidePreview();
    fId.focus();
    renderList();
  }

  // ---- 表单收集 + 校验 ----
  function collect() {
    return {
      id: fId.value.trim(),
      title: fTitle.value.trim(),
      date: fDate.value.trim(),
      tags: fTags.value.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      excerpt: fExcerpt.value.trim(),
      content: fContent.value,
    };
  }
  function validate(p) {
    if (!p.id) return "id 不能为空";
    if (!ID_RE.test(p.id)) return "id 只能用小写字母、数字和短横线";
    if (current === -1 && posts.some((x, i) => x.id === p.id)) return "id 已存在，需唯一";
    if (!p.title) return "标题不能为空";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return "日期格式应为 YYYY-MM-DD";
    return null;
  }

  // ---- 保存 ----
  async function save() {
    if (!token()) { setStatus("请先填入 PAT。", "err"); return; }
    const p = collect();
    const err = validate(p);
    if (err) { setStatus("校验未通过：" + err, "err"); return; }

    if (current === -1) { posts.push(p); }
    else { posts[current] = p; current = posts.findIndex(x => x === p); }

    setStatus("提交中…", "info");
    try {
      const body = {
        message: `content: 更新文章《${p.title}》(${p.id})`,
        content: b64encode(JSON.stringify(posts, null, 2) + "\n"),
        branch: BRANCH,
      };
      if (fileSha) body.sha = fileSha;
      const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${DATA_PATH}`, {
        method: "PUT", headers: Object.assign({ "Content-Type": "application/json" }, headers(true)),
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(httpHint(res.status));
      const data = await res.json();
      fileSha = data.content && data.content.sha;
      renderList();
      setStatus(`已提交到 main（${(data.commit && data.commit.sha || "").slice(0, 7)}）。Pages 约 1–2 分钟生效。`, "ok");
      setDirty(false);
    } catch (e) {
      setStatus("保存失败：" + e.message, "err");
    }
  }

  function del() {
    if (current < 0) return;
    const p = posts[current];
    if (!confirm(`确认删除《${p.title}》(${p.id})？\n（仅从编辑列表移除，需点“保存”才会提交到仓库。）`)) return;
    posts.splice(current, 1);
    current = -1;
    renderList(); showEmpty(); setDirty(true);
  }

  // ---- 预览 ----
  function togglePreview() {
    if (preview.hidden) {
      const html = window.marked ? marked.parse(fContent.value || "") : (fContent.value || "");
      preview.innerHTML = window.DOMPurify ? DOMPurify.sanitize(html) : html;
      preview.hidden = false; fContent.style.display = "none";
      previewToggle.textContent = "编辑";
    } else { hidePreview(); }
  }
  function hidePreview() {
    preview.hidden = true; fContent.style.display = ""; previewToggle.textContent = "预览";
  }

  // ---- 脏标记 ----
  function setDirty(v) { isDirty = v; dirty.hidden = !v; }

  // ---- PAT 记忆 ----
  function initPat() {
    const saved = localStorage.getItem(PAT_KEY);
    if (saved) { patInput.value = saved; remember.checked = true; }
  }
  function persistPat() {
    if (remember.checked && token()) localStorage.setItem(PAT_KEY, token());
    else localStorage.removeItem(PAT_KEY);
  }
  function forgetPat() {
    localStorage.removeItem(PAT_KEY); patInput.value = ""; remember.checked = false;
    fileSha = null; posts = []; renderList(); showEmpty();
    setStatus("已清除本机 PAT 与数据。", "info");
  }

  // ---- 事件绑定 ----
  $("loadBtn").addEventListener("click", () => { persistPat(); load(); });
  $("forgetBtn").addEventListener("click", forgetPat);
  $("newBtn").addEventListener("click", newPost);
  $("saveBtn").addEventListener("click", save);
  $("delBtn").addEventListener("click", del);
  previewToggle.addEventListener("click", togglePreview);
  [fId, fTitle, fDate, fTags, fExcerpt, fContent].forEach(el => el.addEventListener("input", () => setDirty(true)));
  fId.addEventListener("input", () => {
    if (current === -1) {
      const v = fId.value.trim();
      if (v && !ID_RE.test(v)) { idHint.textContent = "只允许小写字母、数字、短横线"; idHint.classList.add("bad"); }
      else if (v && posts.some(x => x.id === v)) { idHint.textContent = "该 id 已存在"; idHint.classList.add("bad"); }
      else { idHint.textContent = ""; idHint.classList.remove("bad"); }
    }
  });
  window.addEventListener("beforeunload", (e) => { if (isDirty) { e.preventDefault(); e.returnValue = ""; } });

  initPat();
  renderList();
  setStatus("填入 PAT 后点「连接并加载」开始编辑。", "info");
})();
