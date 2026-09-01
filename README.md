# Translator

本地优先的轻量浏览器翻译插件，目标平台为 Chrome Desktop 138+。

核心翻译将使用 Chrome 内置 Translator API；翻译历史和收藏仅存储在本地浏览器。不依赖服务器、API Key 或第三方翻译 API。

## 当前进度

- [x] Phase 1：WXT + Vue 3 + TypeScript + MV3 工程骨架
- [x] Phase 1：扩展图标打开独立 translator 窗口
- [x] Phase 2：窗口单实例、尺寸与位置恢复、快捷键
- [x] Phase 3：Chrome Translator API Provider 封装
- [x] Phase 3：Chrome Stable 实机检测（localhost，`availability: downloadable`）
- [ ] Phase 3：Chrome Stable 语言包下载与最终译文（当前隔离 profile 下载未完成）
- [x] Phase 4：独立窗口翻译 UI
- [x] Phase 5：IndexedDB 持久化缓存、历史和收藏
- [x] Phase 6：网页划词按钮与 Popover
- [x] Phase 7：跨页面通信与 pending 请求
- [x] Phase 8：右键菜单翻译
- [x] Phase 9：设置与 UI 收尾
- [x] Phase 10：TypeScript、production build、manifest 与禁止项静态验收

说明：Chrome Stable 的 Translator API 已在 localhost 实机确认可用并返回
`availability: downloadable`；隔离测试 profile 中的语言包下载未在本轮验证环境内完成，
因此最终中文译文的实机验收仍需在允许 Chrome 下载语言包的 profile 中完成。

## 开发

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm typecheck
corepack pnpm build
```

构建产物位于 `.output/`，可在 Chrome 的“扩展程序”页面启用开发者模式后加载对应目录。
