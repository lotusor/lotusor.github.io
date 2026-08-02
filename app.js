/* =========================================================
   lotusor — 纯静态个人博客（雨霁的blog · 隙里碎笔）
   路由 + Markdown 渲染（marked.js）+ 代码高亮（highlight.js）
   文章数据在 POSTS 数组中，新增文章只需往里加对象即可。
   ========================================================= */

/* ---------------------- 文章数据 ---------------------- */
const POSTS = [
  {
    id: "building-this-blog",
    title: "从零搭一个纯静态博客：这一路的折腾与取舍",
    date: "2026-08-03",
    tags: ["前端", "静态博客", "GitHub Pages", "复盘"],
    excerpt: "从空目录到能在线听歌、能搜歌，一个纯静态博客是怎么一步步长出来的，以及那些踩过的坑。",
    content: [
      "> 写在前面：这个博客（lotusor · 隙里碎笔）本身是纯静态的 HTML/CSS/JS，托管在 GitHub Pages 上。这篇文章就记录我从空目录到能在线听歌、能搜歌的完整过程，以及一些踩过的坑。",
      "",
      "## 为什么要自己搭",
      "",
      "现成的平台很多，但想要完全掌控样式、零运行成本、又能顺手练前端，纯静态 + GitHub Pages 是最轻的方案：",
      "",
      "- 不需要服务器，GitHub 免费托管",
      "- 技术栈就是 HTML/CSS/JS，没有框架负担",
      "- 文章用 Markdown 写，渲染交给前端库",
      "",
      "## 第一步：一个能「镇场」的封面",
      "",
      "博客第一眼是封面首页。我做了几件事：",
      "",
      "1. 毛玻璃（glassmorphism）卡片：`backdrop-filter: blur()`",
      "2. 头像 + 社交图标",
      "3. 一句诗意的文案",
      "4. 入场 loader 动画",
      "",
      "背景参考了 emoera.com 的动态渐变，用多层 `radial-gradient` 加 `background-size` 动画做出缓慢流动的深色光晕。",
      "",
      "```css",
      "background:",
      "  radial-gradient(closest-side, rgba(80,120,255,.35), transparent) 20% 30% / 60vmax 60vmax,",
      "  radial-gradient(closest-side, rgba(180,90,255,.30), transparent) 80% 70% / 55vmax 55vmax;",
      "background-repeat: no-repeat;",
      "animation: drift 18s ease-in-out infinite alternate;",
      "```",
      "",
      "## 第二步：文章区与过渡",
      "",
      "文章列表和详情用 hash 路由（`#/blog`、`#/post/:id`）驱动，文章数据放在一个 `POSTS` 数组里，新增文章就是往数组加对象。",
      "",
      "进入文章时加了「幕布式」过渡：一层遮罩滑过，内容淡入，避免生硬跳转。",
      "",
      "## 第三步：右下角的音乐播放器",
      "",
      "想要一个能直接放歌的播放器，最后选了 NeteaseMiniPlayer v3（一个 Web Component），用公共 API 拉取歌曲。关键是把它设成页面级定位，可拖到任意角：",
      "",
      "```html",
      "<nmp-player",
      "  song-id='2127009514'",
      "  theme='dark'",
      "  layout='dock'",
      "  position='bottom-right'",
      "  lyric='true'></nmp-player>",
      "```",
      "",
      "搜索框则「绑」在播放器旁边：用 JS 实时测量播放器的位置，把搜索栏吸附到它边上，缩放窗口或拖动播放器都会重新吸附。",
      "",
      "## 第四步：真的能搜歌",
      "",
      "公共 API 提供搜索接口，搜到歌曲后把 `song-id` 写回播放器，它监听到属性变化就自动重载并播放：",
      "",
      "```js",
      "player.setAttribute('song-id', id);",
      "player.play();",
      "```",
      "",
      "## 踩过的坑",
      "",
      "- **git 浅克隆**：`--depth 1` 克隆后容易提交成游离状态，后来改完整克隆。",
      "- **分支名带斜杠**：`feat/landing` 在某些情况下写不进引用，改成扁平名 `feat-landing-prototype`。",
      "- **本地推送无凭据**：用 Personal Access Token 内联进 URL 推送。",
      "- **仓库改名**：`-lotusor.github.io` 改名成 `start-now`，push 走 GitHub 重定向自动落到新仓库。",
      "",
      "## 写在最后",
      "",
      "一个纯静态博客，从封面到能听歌搜歌，核心代码没几行，但每一个「小功能」背后都是一堆取舍。把它记下来，下次就不必从头踩坑。"
    ].join("\n")
  },
  {
    id: "markov-text-gen",
    title: "用 30 行 JavaScript 写一个迷你 Markov 链文本生成器",
    date: "2026-07-20",
    tags: ["JavaScript", "算法", "有趣"],
    excerpt: "不依赖任何库，用一阶马尔可夫链把一段语料「学」成自己的文风，再吐出看似通顺的胡话。",
    content: [
      "马尔可夫链的核心思想很简单：**下一个词只取决于当前词**。我们用它来「模仿」一段文本的风格。",
      "",
      "## 思路",
      "",
      "1. 把语料按词切开",
      "2. 统计「当前词 → 下一个词」的出现频率",
      "3. 随机游走生成新文本",
      "",
      "## 代码",
      "",
      "```js",
      "function buildChain(text) {",
      "  const words = text.split(/\\s+/).filter(Boolean);",
      "  const chain = {};",
      "  for (let i = 0; i < words.length - 1; i++) {",
      "    const cur = words[i];",
      "    const next = words[i + 1];",
      "    (chain[cur] = chain[cur] || []).push(next);",
      "  }",
      "  return chain;",
      "}",
      "",
      "function generate(chain, start, len = 30) {",
      "  let word = start in chain ? start : Object.keys(chain)[0];",
      "  const out = [word];",
      "  for (let i = 0; i < len; i++) {",
      "    const candidates = chain[word];",
      "    if (!candidates || !candidates.length) break;",
      "    word = candidates[Math.floor(Math.random() * candidates.length)];",
      "    out.push(word);",
      "  }",
      "  return out.join(\" \");",
      "}",
      "",
      "const chain = buildChain(\"代码 是 诗 代码 也是 工具 诗 让人 安静\");",
      "console.log(generate(chain, \"代码\"));",
      "```",
      "",
      "## 效果",
      "",
      "喂进去的句子很短，所以生成结果会比较「repeat」。真实场景里把一整本小说当语料，效果会惊艳很多。",
      "",
      "> 小提示：语料越大，生成的文本越「像人话」，但也越容易抄袭原文——注意版权。"
    ].join("\n")
  },
  {
    id: "http-cache-explained",
    title: "把 HTTP 缓存讲清楚：从强缓存到协商缓存",
    date: "2026-07-12",
    tags: ["前端", "HTTP", "性能"],
    excerpt: "强缓存不发请求，协商缓存发请求但可能 304。一张表 + 几个 Header 就能记住。",
    content: [
      "缓存是前端性能优化的第一道关。先记住一句话：**强缓存不询问服务器，协商缓存会询问但可能拿到 304。**",
      "",
      "## 两类缓存",
      "",
      "| 类型 | 关键 Header | 是否发请求 | 典型状态码 |",
      "| --- | --- | --- | --- |",
      "| 强缓存 | Cache-Control / Expires | 否 | 200 (from disk cache) |",
      "| 协商缓存 | ETag / Last-Modified | 是 | 304 或 200 |",
      "",
      "## 强缓存优先级",
      "",
      "```http",
      "Cache-Control: max-age=3600, public",
      "Expires: Wed, 21 Oct 2026 07:28:00 GMT",
      "```",
      "",
      "现代浏览器优先看 `Cache-Control` 的 `max-age`（相对时间），`Expires` 是绝对时间，容易被时钟漂移影响。",
      "",
      "## 协商缓存",
      "",
      "当强缓存失效，浏览器带上条件请求：",
      "",
      "```http",
      "If-None-Match: \"abc123\"      # 对应响应的 ETag",
      "If-Modified-Since: <date>    # 对应响应的 Last-Modified",
      "```",
      "",
      "服务器比对后，没变就回 `304 Not Modified`，省下传输体积。",
      "",
      "## 实践建议",
      "",
      "- 带 hash 的静态资源（`app.4f3a.js`）用 `max-age=31536000, immutable`",
      "- HTML 用 `no-cache` 让它能走协商，保证及时更新",
      "- 上线前用 DevTools 的 Network 面板确认缓存命中情况"
    ].join("\n")
  },
  {
    id: "write-a-vite-plugin",
    title: "从零写一个 Vite 插件：自动为组件加前缀",
    date: "2026-06-28",
    tags: ["前端", "Vite", "工程化"],
    excerpt: "理解 Vite 插件就是一串钩子函数，再动手实现一个「自动给类名加项目前缀」的小工具。",
    content: [
      "Vite 插件本质上是一个**带钩子（hook）的对象**。最常用的钩子是 `transform`，它能在模块被加载时改写源码。",
      "",
      "## 最小骨架",
      "",
      "```js",
      "export default function myPlugin(options = {}) {",
      "  return {",
      "    name: \"vite-plugin-prefix\",",
      "    transform(code, id) {",
      "      // 只处理 .vue 文件",
      "      if (!id.endsWith(\".vue\")) return null;",
      "      const prefixed = code.replace(/class=\"([^\"]+)\"/g,",
      "        (_, cls) => `class=\"kb-${cls}\"`);",
      "      return { code: prefixed, map: null };",
      "    }",
      "  };",
      "}",
      "```",
      "",
      "## 使用",
      "",
      "```js",
      "// vite.config.js",
      "import prefix from \"./my-plugin\";",
      "export default {",
      "  plugins: [prefix()]",
      "};",
      "```",
      "",
      "## 几个注意点",
      "",
      "1. 钩子返回 `null` 表示「我不处理这个文件」，Vite 会继续往下走",
      "2. 改动源码后最好返回新的 `map`，否则 SourceMap 会错位",
      "3. 插件顺序会影响结果，`enforce: \"pre\" | \"post\"` 可以调整先后",
      "",
      "写插件最大的乐趣，是发现「原来构建工具也不过是一串函数」。"
    ].join("\n")
  },
  {
    id: "love-pure-functions",
    title: "为什么我越来越喜欢纯函数",
    date: "2026-06-10",
    tags: ["JavaScript", "心得", "函数式"],
    excerpt: "同样的输入永远得到同样的输出，没有隐藏状态——这种「无聊」恰恰是它的优点。",
    content: [
      "纯函数有两个铁律：",
      "",
      "1. **相同输入永远得到相同输出**",
      "2. **没有副作用**（不改全局变量、不发请求、不碰 DOM）",
      "",
      "## 对比一下",
      "",
      "```js",
      "// 不纯：依赖外部状态，结果不可预测",
      "let taxRate = 0.1;",
      "function withTax(price) { return price * (1 + taxRate); }",
      "",
      "// 纯：所有依赖都显式传入",
      "function withTaxPure(price, rate) { return price * (1 + rate); }",
      "```",
      "",
      "## 好处",
      "",
      "- **好测试**：不用 mock 环境，直接断言返回值",
      "- **好推理**：读到调用处就能知道结果，不用翻上下文",
      "- **好并行**：没有共享状态，天然线程安全",
      "- **好缓存**：可以用 `memoize` 记住计算结果",
      "",
      "> 当然，程序最终总要「做点什么」（写库、发请求）。纯函数的价值在于把**计算**和**副作用**分开，让核心逻辑保持干净。",
      "",
      "不是所有代码都要纯，但把能纯的部分提纯，复杂度会肉眼可见地下降。"
    ].join("\n")
  },
  {
    id: "git-rebase-clean-history",
    title: "Git 提交历史乱了？用 rebase 收拾干净",
    date: "2026-05-22",
    tags: ["Git", "工具", "心得"],
    excerpt: "「fix typo」「再来一次」堆了一屏？rebase -i 帮你把提交压成一条干净的故事线。",
    content: [
      "本地分支还没推送到远端前，历史随便怎么收拾都行。交互式 rebase 是最常用的整理工具。",
      "",
      "## 启动交互式 rebase",
      "",
      "```bash",
      "git rebase -i HEAD~4",
      "```",
      "",
      "会打开一个编辑器，列出最近 4 个提交：",
      "",
      "```",
      "pick a1b2c3 添加登录接口",
      "pick d4e5f6 fix typo",
      "pick 7a8b9c 补充单元测试",
      "pick 0d1e2f 再来一次",
      "```",
      "",
      "## 常用操作",
      "",
      "- `pick` → 保留",
      "- `squash` / `fixup` → 合并到上一个提交（fixup 丢弃提交信息）",
      "- `reword` → 改提交信息",
      "- `drop` → 删除该提交",
      "",
      "把后三个改成 `fixup`，就能压成一条干净的提交。",
      "",
      "## 黄金法则",
      "",
      "> **只 rebase 你自己的、还没推送到公共分支的提交。** 已经推给别人、且别人基于它工作的历史，千万别动——那会制造「分叉的真相」。",
      "",
      "整理完的历史就像一篇排版好的文章：别人一眼能看懂你为什么这么改。"
    ].join("\n")
  }
];

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
  return `<a class="tag" href="#/tag/${encodeURIComponent(tag)}">${tag}</a>`;
}

/* ---------------------- Markdown 渲染 ---------------------- */
function renderMarkdown(md) {
  if (typeof marked === "undefined") {
    return `<p class="empty">Markdown 解析库未能加载（请检查网络后刷新）。</p>`;
  }
  marked.setOptions({ gfm: true, breaks: true });
  return marked.parse(md);
}

function highlightWithin(root) {
  if (typeof hljs === "undefined") return;
  root.querySelectorAll("pre code").forEach(el => {
    try { hljs.highlightElement(el); } catch (e) { /* ignore */ }
  });
}

/* ---------------------- 视图 ---------------------- */
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
    <a class="friend-card glass" href="${f.url}" target="_blank" rel="noopener" title="${f.name}" aria-label="友站：${f.name}">
      <img src="${f.icon}" alt="${f.name}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
      <span class="friend-fallback">${f.name.charAt(0).toUpperCase()}</span>
      <span>${f.name}</span>
    </a>`;
}

function socialLink(s) {
  return `
    <a class="social glass" href="${s.url}" target="_blank" rel="noopener" title="${s.name}" aria-label="${s.name}">
      <img src="${s.icon}" alt="${s.name}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" />
      <span class="social-fallback">${s.name.charAt(0)}</span>
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
            <img src="https://im.qq.com/favicon.ico" alt="QQ" loading="lazy"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22%238899bb%22><text y=%2218%22 font-size=%2216%22>Q</text></svg>'" />
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
      <h2><a href="#/post/${p.id}">${p.title}</a></h2>
      <div class="post-meta">
        <span>📅 ${p.date}</span>
        <span>🏷 ${p.tags.join(" · ")}</span>
      </div>
      <p class="post-excerpt">${p.excerpt}</p>
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
        <h1>${p.title}</h1>
        <div class="post-meta">
          <span>📅 ${p.date}</span>
          <span>🏷 ${p.tags.join(" · ")}</span>
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
    <h2 class="section-title">标签：${decoded} <span class="count">${posts.length} 篇</span></h2>
    <a class="back-link" href="#/">← 返回首页</a>
    <div class="post-list">${cards}</div>
  `;
}

function viewTags() {
  const tags = allTags();
  $app.innerHTML = `
    <h2 class="section-title">全部标签 <span class="count">${tags.length} 个</span></h2>
    <div class="tag-cloud">
      ${tags.map(([t, c]) => `<a class="tag" href="#/tag/${encodeURIComponent(t)}">${t}<span class="tag-count">${c}</span></a>`).join("")}
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
document.getElementById("year").textContent = new Date().getFullYear();

window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);
// 若脚本在 DOMContentLoaded 之后才执行，也确保渲染一次
if (document.readyState !== "loading") router();

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

/* ---------------------- 音乐搜索（抽屉式：薄壳内搜索 → 写入 NMP 播放器 song-id） ---------------------- */
(function () {
  const dock    = document.getElementById("musicSearch");
  const toggle  = document.getElementById("msToggle");
  const input   = document.getElementById("msInput");
  const clear   = document.getElementById("msClear");
  const results = document.getElementById("msResults");
  const status  = document.getElementById("msStatus");
  if (!dock || !toggle || !input || !results) return;

  const API = "https://api.hypcvgm.top/NeteaseMiniPlayer/nmp.php";
  let debounce, reqId = 0;

  const getPlayer = () => document.querySelector("nmp-player");
  const esc = (s) => String(s).replace(/[&<>\"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmtDur = (ms) => {
    const s = Math.round((ms || 0) / 1000);
    if (!s) return "";
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  };

  /* 抽屉开合 */
  function openDrawer() {
    dock.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
    setTimeout(() => input.focus(), 320);
  }
  function closeDrawer() {
    dock.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    input.value = ""; if (clear) clear.hidden = true;
    results.innerHTML = ""; results.hidden = true; status.textContent = "";
  }
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    dock.classList.contains("open") ? closeDrawer() : openDrawer();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dock.classList.contains("open")) closeDrawer();
  });
  document.addEventListener("click", (e) => {
    if (dock.classList.contains("open") && !dock.contains(e.target)) closeDrawer();
  });

  /* 输入搜索（防抖） */
  input.addEventListener("input", () => {
    if (clear) clear.hidden = !input.value;
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
        return `<li class="ms-result" data-id="${s.id}">
          <span class="ms-cover" ${cover ? `style="background-image:url('${cover}')"` : ""}>♪</span>
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

  /* 点结果 → 切歌 */
  function tryPlay(p, times) {
    if (!times) return;
    setTimeout(() => { try { p.play && p.play(); } catch (_) {}; tryPlay(p, times - 1); }, 900);
  }
  results.addEventListener("click", (e) => {
    const li = e.target.closest(".ms-result");
    if (!li) return;
    const p = getPlayer();
    if (p) {
      p.setAttribute("song-id", li.dataset.id);
      tryPlay(p, 3); // 等歌曲加载完成后尝试自动播放（多次兜底 API 延迟）
    }
    closeDrawer();
  });

  if (clear) clear.addEventListener("click", () => {
    input.value = ""; clear.hidden = true;
    results.hidden = true; results.innerHTML = ""; status.textContent = "";
    input.focus();
  });
})();

/* （已移除 bindSearchToPlayer：播放器改为嵌入 .music-dock 容器，纯 CSS 固定左下角，无需 JS 测量定位） */
