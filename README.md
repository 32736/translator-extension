# Translator

本地优先的轻量浏览器翻译插件，目标平台为 Chrome Desktop 138+。

核心翻译将使用 Chrome 内置 Translator API；翻译历史和收藏仅存储在本地浏览器。不依赖服务器、API Key 或第三方翻译 API。

## 当前进度

- [x] Phase 1：WXT + Vue 3 + TypeScript + MV3 工程骨架
- [x] Phase 1：扩展图标打开独立 translator 窗口
- [x] Phase 2：窗口单实例、尺寸与位置恢复、快捷键
- [x] Phase 3：Chrome Translator API 封装
- [x] Phase 3：Chrome Stable 实机检测（localhost，`availability: downloadable`）
- [x] Phase 3：Chrome Stable 最终中文译文实机验证（独立窗口与网页划词）
- [x] Phase 3：首次语言包下载进度实机验证
- [x] Phase 4：独立窗口翻译 UI
- [x] Phase 5：IndexedDB 持久化缓存、历史和收藏
- [x] Phase 6：网页划词按钮与 Popover
- [x] Phase 7：跨页面通信与 pending 请求
- [x] Phase 8：右键菜单翻译
- [x] Phase 9：设置与 UI 收尾
- [x] Phase 10：TypeScript、production build、manifest 与禁止项静态验收
- [x] V0.2：英中双向翻译与自动语言识别
- [ ] V0.2：本地英汉词典（暂缓）
- [x] V0.3：日语/韩语 → 简体中文
- [x] V0.3：语言目录与语言对校验

说明：Chrome Stable 已实机验证独立窗口、网页划词、首次语言包下载进度以及日语/韩语翻译；词典、更多语言和其它产品功能不在当前计划内。当前支持英文 ↔ 简体中文、日语 → 简体中文、韩语 → 简体中文，自动识别覆盖英文、中文、日文和韩文的明显文本。当前版本只使用 Chrome 内置 Translator API，不提供第三方 API、Responses API 或多 Provider 配置功能；后续仅修复和完善现有本地翻译能力。

完整范围与后续边界见：[技术实施文档](D:/Codes/FQG/translator-extension/docs/translator-extension-v0.1.md)。

## 发布资料

- [Chrome Web Store 公开发布资料](docs/chrome-web-store-release.md)
- [隐私政策](docs/privacy-policy.md)
- [Chrome Web Store 素材说明](docs/store-assets/README.md)

## 开发

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
```

构建产物位于 `.output/`，可在 Chrome 的“扩展程序”页面启用开发者模式后加载对应目录。
