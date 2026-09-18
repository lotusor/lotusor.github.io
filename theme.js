/* =========================================================
   theme.js — 深/浅色主题切换（无闪烁）
   - 在 <head> 内以同步脚本方式引入，早于首屏绘制设置 data-theme，避免闪烁
   - 默认跟随系统 prefers-color-scheme；用户手动切换后写入 localStorage 记住
   - 未手动选择时，随系统主题变化自动跟随；一旦手动选择则锁定
   - 联动：highlight.js 代码高亮样式表(github ↔ github-dark)、<nmp-player> theme 属性
   注意：CSP script-src 无 'unsafe-inline'，故本逻辑必须为外部文件，不能内联。
   ========================================================= */
(function () {
  "use strict";
  var root = document.documentElement;
  var STORE_KEY = "lotusor-theme";

  function systemTheme() {
    try {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
        ? "light" : "dark";
    } catch (_) { return "dark"; }
  }
  function stored() {
    try { return localStorage.getItem(STORE_KEY); } catch (_) { return null; }
  }
  function resolve() {
    var s = stored();
    return (s === "light" || s === "dark") ? s : systemTheme();
  }

  // 切换 highlight.js 两套预载样式表（disabled 属性控制，避免二次请求/闪烁）
  function syncHljs(theme) {
    var light = document.getElementById("hljs-light");
    var dark  = document.getElementById("hljs-dark");
    if (light && dark) {
      light.disabled = theme !== "light";
      dark.disabled  = theme !== "dark";
    }
  }
  // 切换 NMP 播放器自带主题
  function syncPlayer(theme) {
    var p = document.querySelector("nmp-player");
    if (p) { try { p.setAttribute("theme", theme); } catch (_) {} }
  }
  function syncButton(theme) {
    var btn = document.getElementById("themeToggle");
    if (!btn) return;
    btn.setAttribute("aria-pressed", theme === "light" ? "true" : "false");
    btn.setAttribute("title", theme === "light" ? "切换到深色模式" : "切换到浅色模式");
    btn.setAttribute("aria-label", theme === "light" ? "切换到深色模式" : "切换到浅色模式");
    var ic = btn.querySelector(".theme-icon");
    if (ic) ic.textContent = theme === "light" ? "☾" : "☀";
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);
    syncHljs(theme);
    syncPlayer(theme);
    syncButton(theme);
  }

  // 首屏尽早设置，避免浅色页面闪一下深色（或反之）
  root.setAttribute("data-theme", resolve());

  function init() {
    apply(resolve());
    var btn = document.getElementById("themeToggle");
    if (btn) {
      btn.addEventListener("click", function () {
        var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
        try { localStorage.setItem(STORE_KEY, next); } catch (_) {}
        root.classList.add("theme-anim");   // 一次性平滑过渡
        apply(next);
        setTimeout(function () { root.classList.remove("theme-anim"); }, 340);
      });
    }
    // 未手动选择时，跟随系统实时变化
    try {
      var mq = window.matchMedia("(prefers-color-scheme: light)");
      var onChange = function () { if (!stored()) apply(systemTheme()); };
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else if (mq.addListener) mq.addListener(onChange);
    } catch (_) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
