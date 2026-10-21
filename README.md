# lotusor.github.io

[![Public repo guard](https://github.com/lotusor/lotusor.github.io/actions/workflows/public-repo-guard.yml/badge.svg)](https://github.com/lotusor/lotusor.github.io/actions/workflows/public-repo-guard.yml)

个人技术博客，纯静态站点，托管在 GitHub Pages。

## 结构

| 路径 | 内容 |
|---|---|
| `index.html` / `app.js` | 首页、搜索、音乐播放器与文章渲染 |
| `content/posts.json` | 文章数据（前台直接读取） |
| `admin/` | 本地文章编辑器（Vditor + GitHub Contents API） |
| `assets/` | 头像、封面、二维码、BGM 等静态资源 |
| `styles.css` / `landing.css` / `light.css` / `theme.js` | 样式与主题切换 |

## 本地预览

```bash
python -m http.server 8080
# 打开 http://127.0.0.1:8080/
```

## 文章编辑

`admin/` 是维护者自用的静态编辑器：

- 口令门只用于挡住误入者，**不是安全边界**；
- 真正写入 GitHub 需要维护者本机提供的 fine-grained PAT（仅限本仓库 Contents 读写）；
- 勾选“记住”会把 PAT 存到本机 `localStorage`，不要在共用电脑上使用；
- 草稿同样写入公开的 `content/posts.json`，**草稿内容也是公开的**，不要存放私密内容。

## 安全与隐私

- 仓库中的 Bilibili / 牛客主页链接、QQ 二维码等属于站点公开联系方式；如不希望被索引，请直接删除对应资源。
- 安全漏洞请通过 [SECURITY.md](SECURITY.md) 的 GitHub Security Advisories 私下报告，不要开公开 Issue。
- 不要在本仓库提交 PAT、Token、`.env`、服务器信息或内部运维文档。
- 提交前运行 `python .github/scripts/check_public_repo.py`；CI 会在 push/PR 时执行同一门禁。

## 贡献

外部代码贡献请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)；文章与个人资源由维护者维护。

## 许可

站点代码用于个人博客展示；文章与图片版权归作者所有，未经许可请勿转载。
