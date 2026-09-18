/* =========================================================
   lotusor — 纯静态个人博客（雨霁的blog · 隙里碎笔）
   路由 + Markdown 渲染（marked.js）+ 代码高亮（highlight.js）
   文章数据在 POSTS 数组中，新增文章只需往里加对象即可。
   ========================================================= */

/* ---------------------- 文章数据 ---------------------- */
/* 文章数据已外置到 content/posts.json（便于在线编辑/程序化写入）；启动时异步加载填充 POSTS。 */
let POSTS = [];
/* ---------------------- 工具函数 ---------------------- */
const $app = document.getElementById("app");

function byDateDesc(a, b) {
  return a.date < b.date ? 1 : -1;
}

function allTags() {
  const map = new Map();
  POSTS.forEach(p => p.tags.forEach(t => map.set(t, (map.get(t) || 0) + 1)));
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

function tagLink(tag) {
  return `<a class="tag" href="#/tag/${encodeURIComponent(tag)}">${escHtml(tag)}</a>`;
}

/* ---------------------- Markdown 渲染（marked + DOMPurify 净化） ---------------------- */
function renderMarkdown(md) {
  if (typeof marked === "undefined") {
    return `<p class="empty">Markdown 解析库未能加载（请检查网络后刷新）。</p>`;
  }
  marked.setOptions({ gfm: true, breaks: true });
  const html = marked.parse(md);
  // marked v5+ 已移除 sanitize 选项，原始 HTML 会放行；接 DOMPurify 兜底防存储 XSS
  return (typeof DOMPurify !== "undefined") ? DOMPurify.sanitize(html) : html;
}

function highlightWithin(root) {
  if (typeof hljs === "undefined") return;
  root.querySelectorAll("pre code").forEach(el => {
    try { hljs.highlightElement(el); } catch (e) { /* ignore */ }
  });
}

/* ---------------------- 视图 ---------------------- */

/* 图片加载失败兜底：委托监听 error（capture 阶段捕获不冒泡的 error 事件），
   替代模板中的内联 onerror，从而允许严格 CSP（script-src 无 'unsafe-inline'） */
const FALLBACK_SVG = "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%238899bb%22><text y=%2218%22 font-size=%2216%22>Q</text></svg>";
document.addEventListener("error", (e) => {
  const img = e.target;
  if (!img || img.tagName !== "IMG") return;
  const mode = img.dataset && img.dataset.fallback;
  if (!mode || img.dataset.fbDone) return;
  img.dataset.fbDone = "1";
  if (mode === "svg") {
    img.src = FALLBACK_SVG;
  } else if (mode === "hide") {
    img.style.display = "none";
    const sib = img.nextElementSibling;
    if (sib) sib.style.display = "grid";
  }
}, true);
/* ---------------------- 社交链接（封面用） ---------------------- */
const SOCIALS = [
  { name: "Bilibili", url: "https://space.bilibili.com/1806826320?spm_id_from=333.1007.0.0", icon: "https://www.bilibili.com/favicon.ico" },
  { name: "牛客",     url: "https://www.nowcoder.com/users/130982921",                          icon: "https://www.nowcoder.com/favicon.ico" },
  { name: "GitHub",   url: "https://github.com/lotusor?tab=stars",                             icon: "https://github.com/favicon.ico" }
];

/* ---------------------- 友站推荐 ---------------------- */
const FRIENDS = [
  { name: "emoera", url: "https://emoera.com", icon: "https://emoera.com/favicon.ico" }
];

function friendLink(f) {
  return `
    <a class="friend-card glass" href="${escAttr(f.url)}" target="_blank" rel="noopener" title="${escAttr(f.name)}" aria-label="友站：${escAttr(f.name)}">
      <img src="${escAttr(f.icon)}" alt="${escAttr(f.name)}" loading="lazy" data-fallback="hide" />
      <span class="friend-fallback">${escHtml(f.name.charAt(0).toUpperCase())}</span>
      <span>${escHtml(f.name)}</span>
    </a>`;
}

function socialLink(s) {
  return `
    <a class="social glass" href="${escAttr(s.url)}" target="_blank" rel="noopener" title="${escAttr(s.name)}" aria-label="${escAttr(s.name)}">
      <img src="${escAttr(s.icon)}" alt="${escAttr(s.name)}" loading="lazy" data-fallback="hide" />
      <span class="social-fallback">${escHtml(s.name.charAt(0))}</span>
    </a>`;
}

/* ---------------------- 封面（首页） ---------------------- */
function viewLanding() {
  document.body.classList.remove("on-blog");
  const socials = SOCIALS.map(socialLink).join("");
  $app.innerHTML = `
    <div class="cover-grid" aria-hidden="true"></div>
    <section class="cover">
      <div class="cover-avatar">
        <img src="assets/avatar.jpg" alt="lotusor" />
      </div>
      <p class="cover-quote">“所有的命运都已写就，<br>所有的泪水都将启程”</p>
      <div class="cover-socials">
        ${socials}
        <div class="qq-wrap">
          <div class="qq-icon-btn glass" title="QQ 二维码" aria-label="QQ 二维码">
            <img src="https://im.qq.com/favicon.ico" alt="QQ" loading="lazy" data-fallback="svg" />
          </div>
          <div class="qq-qr-panel">
            <img src="assets/qq-qr.png" alt="QQ 二维码" />
          </div>
        </div>
      </div>
      <a class="my-think glass" href="#/blog">MY-THINK →</a>
      <div class="friend-sites">
        <p class="friend-sites-title">友站推荐</p>
        <div class="friend-sites-list">
          ${FRIENDS.map(friendLink).join("")}
        </div>
      </div>
    </section>
  `;
}

/* ---------------------- 文章列表（MY-THINK 进入） ---------------------- */
function viewBlog() {
  const posts = [...POSTS].sort(byDateDesc);
  const tags = allTags().slice(0, 8);
  const cards = posts.map(postCard).join("");
  $app.innerHTML = `
    <section class="blog-head">
      <a class="back-link" href="#/">← 返回封面</a>
      <h1 class="blog-title">文章</h1>
      <p class="blog-sub">记录用代码理解世界的过程——有些是踩坑，有些是顿悟。</p>
    </section>
    <div class="post-list">${cards}</div>
    ${tags.length ? `<h2 class="section-title" style="margin-top:34px">热门标签</h2>
      <div class="tag-row">${tags.map(([t]) => tagLink(t)).join("")}</div>` : ""}
  `;
}

function postCard(p) {
  return `
    <article class="post-card">
      <h2><a href="#/post/${p.id}">${escHtml(p.title)}</a></h2>
      <div class="post-meta">
        <span>📅 ${escHtml(p.date)}</span>
        <span>🏷 ${p.tags.map(escHtml).join(" · ")}</span>
      </div>
      <p class="post-excerpt">${escHtml(p.excerpt)}</p>
      <div class="tag-row">${p.tags.map(t => tagLink(t)).join("")}</div>
    </article>
  `;
}

function viewPost(id) {
  const p = POSTS.find(x => x.id === id);
  if (!p) { viewNotFound(); return; }
  $app.innerHTML = `
    <article class="article">
      <a class="back-link" href="#/">← 返回文章列表</a>
      <header class="article-header">
        <h1>${escHtml(p.title)}</h1>
        <div class="post-meta">
          <span>📅 ${escHtml(p.date)}</span>
          <span>🏷 ${p.tags.map(escHtml).join(" · ")}</span>
        </div>
      </header>
      <div class="article-body">${renderMarkdown(p.content)}</div>
    </article>
  `;
  highlightWithin($app);
}

function viewTag(tag) {
  const decoded = decodeURIComponent(tag);
  const posts = POSTS.filter(p => p.tags.includes(decoded)).sort(byDateDesc);
  const cards = posts.length ? posts.map(postCard).join("")
    : `<p class="empty">这个标签下还没有文章。</p>`;
  $app.innerHTML = `
    <h2 class="section-title">标签：${escHtml(decoded)} <span class="count">${posts.length} 篇</span></h2>
    <a class="back-link" href="#/">← 返回首页</a>
    <div class="post-list">${cards}</div>
  `;
}

function viewTags() {
  const tags = allTags();
  $app.innerHTML = `
    <h2 class="section-title">全部标签 <span class="count">${tags.length} 个</span></h2>
    <div class="tag-cloud">
      ${tags.map(([t, c]) => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">${escHtml(t)}<span class="tag-count">${escHtml(String(c))}</span></a>`).join("")}
    </div>
  `;
}

function viewAbout() {
  $app.innerHTML = `
    <section class="about">
      <h1>关于我</h1>
      <p class="lead">你好，我是一个喜欢把复杂问题拆成小函数的人。白天写业务代码，晚上写一些「没什么用但很有趣」的小工具。</p>

      <div class="about-section">
        <h2>我关注的方向</h2>
        <p>前端工程化、可视化、以及一切能让开发体验变好的小技巧。相信「能跑起来的代码」比「完美的架构图」更有说服力。</p>
      </div>

      <div class="about-section">
        <h2>技术栈</h2>
        <div class="skill-list">
          <span class="skill">JavaScript / TypeScript</span>
          <span class="skill">React / Vue</span>
          <span class="skill">Node.js</span>
          <span class="skill">Vite / Webpack</span>
          <span class="skill">Python</span>
          <span class="skill">Git</span>
        </div>
      </div>

      <div class="about-section">
        <h2>写这个博客的初衷</h2>
        <p>把学过的东西讲清楚，是最好的复习。如果某一篇文章恰好帮你省了半小时调试时间，那就值了。</p>
      </div>

      <div class="about-section">
        <h2>找到我</h2>
        <div class="link-list">
          <a href="#/">← 回到文章</a>
          <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>
          <a href="mailto:hi@example.com">Email</a>
        </div>
      </div>
    </section>
  `;
}

function viewNotFound() {
  $app.innerHTML = `<p class="empty">没有找到这个页面。<a href="#/">回到首页</a></p>`;
}

/* ---------------------- 路由 ---------------------- */
let _prevRoute = ""; // 记录上一个路由，用于判断是否需要过渡动画

function setActiveNav(route) {
  document.querySelectorAll(".site-nav a").forEach(a => {
    a.classList.toggle("active", a.dataset.route === route);
  });
}

/* 幕布过渡：从底部向上展开再向下收起 */
function playCurtainTransition(callback) {
  const curtain = document.createElement("div");
  curtain.className = "page-curtain page-curtain--enter";
  document.body.appendChild(curtain);
  // 进入幕布完成后执行回调（渲染新页面），然后播放退出幕布
  curtain.addEventListener("animationend", () => {
    callback();
    curtain.className = "page-curtain page-curtain--exit";
    curtain.addEventListener("animationend", () => curtain.remove(), { once: true });
    // 兜底移除
    setTimeout(() => { if (curtain.isConnected) curtain.remove(); }, 700);
  }, { once: true });
}

/* 给 $app 内容加淡入动画 */
function fadeInContent() {
  $app.classList.remove("content-fade-in");
  // 触发 reflow 以重启动画
  void $app.offsetWidth;
  $app.classList.add("content-fade-in");
}

function router() {
  const hash = location.hash || "#/";
  const parts = hash.replace(/^#\//, "").split("/");
  const currentRoute = parts[0] || "home";

  // 判断是否需要幕布过渡：封面↔文章区 / 文章列表↔详情
  const fromLanding = (_prevRoute === "" || _prevRoute === "home");
  const toLanding   = (currentRoute === "" || currentRoute === "home");
  const needsCurtain = (fromLanding !== toLanding) || (_prevRoute === "blog" && currentRoute === "post") || (_prevRoute === "post" && currentRoute === "blog");

  const render = () => {
    if (currentRoute === "" || currentRoute === "home") {
      setActiveNav("home"); viewLanding();
    } else if (currentRoute === "blog") {
      document.body.classList.add("on-blog"); setActiveNav("blog"); viewBlog();
    } else if (currentRoute === "post") {
      document.body.classList.add("on-blog"); setActiveNav("blog"); viewPost(parts[1]);
    } else if (currentRoute === "tag") {
      document.body.classList.add("on-blog"); setActiveNav("tags"); viewTag(parts[1] || "");
    } else if (currentRoute === "tags") {
      document.body.classList.add("on-blog"); setActiveNav("tags"); viewTags();
    } else if (currentRoute === "about") {
      document.body.classList.add("on-blog"); setActiveNav("about"); viewAbout();
    } else {
      document.body.classList.add("on-blog"); viewNotFound();
    }
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
    fadeInContent();
    _prevRoute = currentRoute;
  };

  if (needsCurtain && _prevRoute !== "") {
    playCurtainTransition(render);
  } else {
    render();
  }
}

/* ---------------------- 初始化 ---------------------- */
function startApp() {
  document.getElementById("year").textContent = new Date().getFullYear();
  window.addEventListener("hashchange", router);
  window.addEventListener("DOMContentLoaded", router);
  if (document.readyState !== "loading") router();
}
function loadPosts() {
  return fetch("content/posts.json", { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
    .then(data => { POSTS = Array.isArray(data) ? data : []; })
    .catch(err => {
      console.error("加载文章数据失败：", err);
      POSTS = [];
      const app = document.getElementById("app");
      if (app) app.innerHTML = '<div class="empty">文章数据加载失败，请稍后重试。</div>';
    });
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => loadPosts().then(startApp));
} else {
  loadPosts().then(startApp);
}

/* ---------------------- 入场 loading 动画 ---------------------- */
(function () {
  const loader = document.getElementById("loader");
  if (!loader) return;
  const hide = () => {
    loader.classList.add("loader--hidden");
    loader.addEventListener("transitionend", () => loader.remove(), { once: true });
    setTimeout(() => { if (loader.isConnected) loader.remove(); }, 1200); // 兜底移除
  };
  // 首屏渲染后稍作停顿再淡出（切入动画）
  setTimeout(hide, 1100);
})();

/* ---------------------- 音乐搜索（内联搜索栏 → 写入 NMP 播放器 song-id） ---------------------- */
(function () {
  const search   = document.getElementById("musicSearch");
  const inline   = document.getElementById("msInline");
  const inputWrap = inline ? inline.querySelector(".ms-inline-input-wrap") : null;
  const input    = document.getElementById("msInput");
  const results  = document.getElementById("msResults");
  const status   = document.getElementById("msStatus");
  const closeBtn = document.getElementById("msClose");
  if (!search || !inline || !inputWrap || !input || !results) return;

  const API = "https://api.hypcvgm.top/NeteaseMiniPlayer/nmp.php";
  let debounce, player = null, reqId = 0;

  const getPlayer = () => (player ||= document.querySelector("nmp-player"));
  const esc = (s) => String(s).replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDur = (ms) => {
    const s = Math.round((ms || 0) / 1000);
    if (!s) return "";
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };

  /* 展开/折叠搜索输入框 */
  const expand = () => {
    inputWrap.classList.add("ms-active");
    closeBtn.hidden = false;
    setTimeout(() => input.focus(), 50);
  };
  const collapse = () => {
    inputWrap.classList.remove("ms-active");
    closeBtn.hidden = true;
    input.value = "";
    results.innerHTML = "";
    results.hidden = true;
    status.textContent = "";
  };

  /* 点击折叠状态的输入区域 → 展开 */
  inputWrap.addEventListener("click", (e) => {
    if (!inputWrap.classList.contains("ms-active")) {
      e.preventDefault();
      expand();
    }
  });

  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); collapse(); });

  /* 注：原「点击外部收起 / Escape 收起」已移除——搜索现常驻抽屉面板内，
     抽屉是持久浮层，不需要失焦即清空（否则切换 Tab 会误清结果）。 */

  /* 输入防抖搜索 */
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    const q = input.value.trim();
    if (!q) { results.innerHTML = ""; results.hidden = true; status.textContent = ""; return; }
    status.textContent = "搜索中…";
    const my = ++reqId;
    debounce = setTimeout(() => doSearch(q, my), 350);
  });

  async function doSearch(q, my) {
    try {
      const res = await fetch(`${API}/search?keywords=${encodeURIComponent(q)}&limit=15`);
      const data = await res.json();
      if (my !== reqId) return; // 已有更新的请求，丢弃旧结果
      const songs = (data.result && data.result.songs) || [];
      if (!songs.length) { results.innerHTML = ""; results.hidden = true; status.textContent = "无结果"; return; }

      // 批量取封面
      const ids = songs.map(s => s.id).join(",");
      const coverMap = {};
      try {
        const d2 = await (await fetch(`${API}/song/detail?ids=${ids}`)).json();
        (d2.songs || []).forEach(s => { if (s.id != null && s.al && s.al.picUrl) coverMap[s.id] = s.al.picUrl; });
      } catch (_) {}

      results.innerHTML = songs.map(s => {
        const arts = (s.artists || s.ar || []).map(a => a.name).join("/") || "未知歌手";
        const cover = coverMap[s.id] || "";
        const dur = fmtDur(s.duration || s.dt);
        return `<li class="ms-result" data-id="${s.id}" data-name="${escAttr(s.name)}" data-artist="${escAttr(arts)}" data-cover="${escAttr(cover)}">
          <span class="ms-cover" ${cover ? `style="background-image:url('${escAttr(cover)}')"` : ""}>♪</span>
          <span class="ms-meta">
            <span class="ms-name">${esc(s.name)}</span>
            <span class="ms-artist">${esc(arts)}</span>
          </span>
          <span class="ms-dur">${dur}</span>
        </li>`;
      }).join("");
      results.hidden = false;
      status.textContent = "";
    } catch (err) {
      if (my !== reqId) return;
      results.innerHTML = ""; results.hidden = true; status.textContent = "失败";
    }
  }

  /* 点结果 → 切歌（自动播放 + 记入历史点播记录） */
  results.addEventListener("click", (e) => {
    const li = e.target.closest(".ms-result");
    if (!li) return;
    playSong({ id: li.dataset.id, name: li.dataset.name, artist: li.dataset.artist, cover: li.dataset.cover });
    collapse();
  });
})();

/* ---------------------- 历史点播记录（本地保存，最多 20 首） ----------------------
   说明：NMP v3 是黑盒 Web Component，只能接受 song-id / playlist-id（服务端歌单），
   无法把本地数组当歌单。因此「歌单 = 历史点播记录」由我们自己的面板实现：
   面板点击 → 写入播放器 song-id → 自动播放，并把歌曲记入 localStorage。 */
const HISTORY_KEY = "lotusor-play-history";
const HISTORY_MAX = 20;
let _currentSongId = null;

function getPlayerEl() { return document.querySelector("nmp-player"); }

function loadHistory() {
  try { const v = JSON.parse(localStorage.getItem(HISTORY_KEY)); return Array.isArray(v) ? v : []; }
  catch (_) { return []; }
}
function saveHistory(list) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(list)); } catch (_) {}
}

/* 共享：播放一首歌 —— 写回 song-id + 重试自动播放 + 记入历史（去重置顶、限 20） */
function playSong(song) {
  if (!song || !song.id) return;
  const p = getPlayerEl();
  if (!p) return;
  p.setAttribute("song-id", song.id);
  _currentSongId = String(song.id);
  // NMP 切换歌曲需一点加载时间，多次重试 play() 兜底浏览器/接口延迟
  let n = 3;
  (function attempt() {
    if (!n--) return;
    setTimeout(() => { try { p.play && p.play(); } catch (_) {} attempt(); }, 900);
  })();
  // 记入历史
  const list = loadHistory().filter(s => String(s.id) !== String(song.id));
  list.unshift({
    id: song.id,
    name: song.name || "未知歌曲",
    artist: song.artist || "未知歌手",
    cover: song.cover || "",
    ts: Date.now()
  });
  if (list.length > HISTORY_MAX) list.length = HISTORY_MAX;
  saveHistory(list);
  renderHistory();
  // 让抽屉展开并切到「播放」，用户能立刻看到切歌效果
  if (window.__musicDrawer) { try { window.__musicDrawer.expand(); window.__musicDrawer.showTab("play"); } catch (_) {} }
}

function escAttr(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* 渲染历史列表 + 高亮当前播放 */
function renderHistory() {
  const panel = document.getElementById("historyPanel");
  const listEl = document.getElementById("historyList");
  const emptyEl = document.getElementById("historyEmpty");
  const countEl = document.getElementById("historyCount");
  if (!listEl) return;
  const list = loadHistory();
  if (countEl) countEl.textContent = String(list.length);
  if (!list.length) {
    listEl.innerHTML = "";
    if (emptyEl) emptyEl.hidden = false;
    return;
  }
  if (emptyEl) emptyEl.hidden = true;
  listEl.innerHTML = list.map(s => `
    <li>
      <button class="history-item ${String(s.id) === _currentSongId ? "is-playing" : ""}" type="button"
              data-id="${escAttr(s.id)}" data-name="${escAttr(s.name)}" data-artist="${escAttr(s.artist)}" data-cover="${escAttr(s.cover)}"
              aria-label="播放 ${escAttr(s.name)} - ${escAttr(s.artist)}">
        <span class="history-cover" ${s.cover ? `style="background-image:url('${escAttr(s.cover)}')"` : ""}>♪</span>
        <span class="history-meta">
          <span class="history-name">${escHtml(s.name)}</span>
          <span class="history-artist">${escHtml(s.artist)}</span>
        </span>
        <svg class="hi-play" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
      </button>
    </li>`).join("");
}

/* 历史面板交互（现常驻「历史」Tab 内，无浮层开合） */
(function () {
  const listEl = document.getElementById("historyList");
  const clearBtn = document.getElementById("historyClear");
  if (!listEl) return;
  listEl.addEventListener("click", (e) => {
    const btn = e.target.closest(".history-item");
    if (!btn) return;
    playSong({ id: btn.dataset.id, name: btn.dataset.name, artist: btn.dataset.artist, cover: btn.dataset.cover });
  });
  if (clearBtn) clearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    saveHistory([]);
    _currentSongId = null;
    renderHistory();
  });
  renderHistory(); // 首次渲染（读取本地历史）
})();

/* ---------------------- 音乐抽屉：选项卡 + 收起/展开 + 拖拽移动 ---------------------- */
(function () {
  const drawer   = document.getElementById("musicDrawer");
  const body     = document.getElementById("drawerBody");
  const launcher = document.getElementById("musicLauncher");
  const collapseBtn = document.getElementById("drawerCollapse");
  const handle   = document.getElementById("drawerHandle");
  if (!drawer || !body) return;

  const POS_KEY = "lotusor-drawer-pos";
  const COL_KEY = "lotusor-drawer-collapsed";
  const TAB_KEY = "lotusor-drawer-tab";
  const readJSON = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
  const write = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };

  /* ---- 选项卡 ---- */
  const tabs   = Array.from(drawer.querySelectorAll(".dtab"));
  const panels = Array.from(drawer.querySelectorAll(".dpanel"));
  function showTab(name) {
    tabs.forEach(t => {
      const on = t.dataset.tab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", String(on));
    });
    panels.forEach(p => p.classList.toggle("is-active", p.dataset.panel === name));
    write(TAB_KEY, JSON.stringify(name));
  }
  tabs.forEach(t => t.addEventListener("click", () => showTab(t.dataset.tab)));

  /* ---- 位置（拖拽） ---- */
  function clamp(x, y) {
    const r = body.getBoundingClientRect();
    const w = r.width || 300, h = r.height || 360;
    return [
      Math.max(8, Math.min(x, window.innerWidth  - w - 8)),
      Math.max(8, Math.min(y, window.innerHeight - h - 8)),
    ];
  }
  function setPos(x, y, save) {
    const [cx, cy] = clamp(x, y);
    drawer.style.left = cx + "px";
    drawer.style.top  = cy + "px";
    drawer.style.right = "auto";
    drawer.style.bottom = "auto";
    if (save) write(POS_KEY, JSON.stringify({ x: cx, y: cy }));
  }
  function applySavedPos() {
    const p = readJSON(POS_KEY, null);
    if (p && typeof p.x === "number" && typeof p.y === "number") setPos(p.x, p.y, false);
  }

  /* ---- 收起 / 展开 ---- */
  function setCollapsed(v) {
    drawer.setAttribute("data-collapsed", v ? "true" : "false");
    write(COL_KEY, JSON.stringify(v));
  }
  function expand() { setCollapsed(false); }
  if (collapseBtn) collapseBtn.addEventListener("click", () => setCollapsed(true));
  if (launcher) launcher.addEventListener("click", expand);

  /* ---- 拖拽把手 ---- */
  let drag = null;
  if (handle) {
    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".drawer-collapse")) return;
      const r = drawer.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      drawer.classList.add("is-dragging");
      try { handle.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    handle.addEventListener("pointermove", (e) => {
      if (!drag) return;
      setPos(e.clientX - drag.dx, e.clientY - drag.dy, false);
    });
    const end = (e) => {
      if (!drag) return;
      drag = null;
      drawer.classList.remove("is-dragging");
      const r = drawer.getBoundingClientRect();
      setPos(r.left, r.top, true);
      try { handle.releasePointerCapture(e.pointerId); } catch (_) {}
    };
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
  }
  window.addEventListener("resize", () => {
    if (drawer.style.left) { const r = drawer.getBoundingClientRect(); setPos(r.left, r.top, true); }
  });

  /* ---- 初始化 ---- */
  applySavedPos();
  setCollapsed(readJSON(COL_KEY, false) === true);
  showTab(readJSON(TAB_KEY, "play"));

  window.__musicDrawer = { showTab, expand, setCollapsed };
})();
