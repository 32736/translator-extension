# 本地优先浏览器翻译插件 V0.1 技术实施文档

> 面向 AI Coding Agent 的直接实施文档  
> 目标平台：Chrome Desktop 138+，优先 Windows 11；后续兼容 Edge  
> 技术栈：WXT + Vue 3 + TypeScript + Manifest V3 + Chrome Translator API + IndexedDB  
> 产品定位：个人使用的“单词 / 短语 / 短句”轻量翻译工具  
> 核心原则：本地优先、零服务端、零 API Key、翻译效果与响应速度优先

---

## 0. 实施总则（AI 必须遵守）

以下约束属于强制要求，不允许在实现过程中自行改成其他架构：

1. **不要实现传统 toolbar popup。**
   - 点击扩展图标时必须打开一个独立浏览器窗口。
   - 独立窗口使用 `chrome.windows.create({ type: 'popup' })`。
   - 独立窗口必须保持单实例：如果已存在，则聚焦已有窗口。

2. **不要在 Background Service Worker 中直接调用 Translator API。**
   - MV3 Background 只负责：
     - 独立窗口创建/激活；
     - 右键菜单；
     - 快捷键；
     - Content Script 与翻译窗口之间的消息协调；
     - 少量临时状态保存。
   - 翻译执行放在拥有 DOM / Window 上下文的扩展页面或 Content Script 侧。

3. **V0.1 不接任何第三方翻译 API。**
   - 不使用 OpenAI。
   - 不使用 Gemini API。
   - 不使用 DeepL。
   - 不使用 Azure Translator。
   - 不需要服务器。
   - 不需要登录。
   - 不需要 API Key。

4. **核心翻译使用 Chrome Built-in Translator API。**
   - 最低 Chrome 版本为 138。
   - 目标语言 V0.1 固定支持：英文 -> 简体中文。
   - 代码必须预留 Provider 抽象，但 V0.1 只实现 `ChromeTranslatorProvider`。

5. **网页划词不要“选中即自动翻译”。**
   - 用户选中文字后，出现一个很小的 `[译]` 按钮。
   - 点击 `[译]` 才开始翻译。
   - 这样既减少误触，也满足首次语言模型创建/下载时的用户操作触发需求。

6. **独立窗口是产品主界面。**
   - 用户可直接输入单词/短句。
   - 支持历史、收藏、一键复制、发音。
   - 网页划词只属于快速入口。

7. **本地数据使用 IndexedDB。**
   - `chrome.storage.sync` 只保存少量设置。
   - `chrome.storage.local` 保存窗口尺寸/位置等小数据。
   - 历史、收藏、翻译缓存、后续词典数据使用 IndexedDB。

8. **不要为了 V0.1 引入 Element Plus、Pinia、RxJS 等不必要依赖。**
   - Vue 3 Composition API 即可。
   - 图标可使用 `lucide-vue-next`。
   - 样式使用原生 CSS / CSS Variables。
   - 状态规模很小，不需要全局状态库。

9. **所有核心逻辑必须 TypeScript strict。**
   - 禁止 `any`，除非是针对尚未进入 TS lib 的 Chrome Built-in AI API 做最小范围的类型桥接。
   - 对 Built-in AI API 应单独提供类型声明文件。

10. **不要超范围实现。**
    V0.1 禁止加入：
    - 全文网页翻译；
    - PDF 翻译；
    - OCR；
    - 截图翻译；
    - 云同步；
    - 用户系统；
    - AI 对话；
    - Prompt API；
    - 多 Provider UI；
    - 自建服务端。

---

# 1. 产品目标

开发一个 Chrome 浏览器扩展，用于个人日常翻译：

- 英文单词；
- 英文短语；
- 英文短句；
- 软件开发相关英文；
- 浏览器网页划词；
- 独立翻译窗口手动输入。

核心体验：

```text
网页中选中英文
    ↓
出现 [译]
    ↓
点击
    ↓
网页浮层显示中文
    ↓
可点击“在翻译器中打开”
    ↓
独立翻译窗口聚焦并展示结果
```

同时：

```text
点击扩展图标
或 Ctrl + Shift + L
    ↓
打开 / 激活独立翻译窗口
    ↓
直接输入英文
    ↓
实时/手动翻译
```

---

# 2. V0.1 功能范围

## 2.1 必须实现

### 独立窗口

- 点击扩展图标打开独立窗口；
- 快捷键 `Ctrl + Shift + L` 打开独立窗口；
- 窗口单实例；
- 已存在时聚焦；
- 默认尺寸约 `460 x 680`；
- 保存窗口的：
  - left
  - top
  - width
  - height
- 下次打开恢复上次尺寸/位置；
- 支持浅色/深色跟随系统。

### 翻译

- 英文 -> 简体中文；
- 使用 Chrome Translator API；
- 能检测 API 是否可用；
- 能检测语言对模型状态；
- 首次需要下载时：
  - 明确提示；
  - 显示下载进度；
  - 下载后自动继续翻译；
- 翻译失败要有明确错误状态；
- 支持取消正在进行的翻译任务。

### 网页划词

- 鼠标选择非空文本；
- 鼠标松开后显示一个很小的 `[译]` 按钮；
- 点击后翻译；
- 页面浮层显示：
  - 原文；
  - 译文；
  - 复制；
  - 在独立窗口打开；
- 点击页面其他位置后隐藏按钮/结果；
- `Esc` 隐藏；
- 页面滚动、窗口 resize 时正确处理位置；
- 不破坏页面原有 DOM；
- 不能插入到用户选中文本内部。

### 右键菜单

选中文字后右键：

```text
翻译所选文本
```

点击后：
- 打开/激活独立窗口；
- 将 selectionText 发送给独立窗口；
- 自动翻译。

### 独立窗口输入

- textarea/input；
- 支持粘贴；
- 支持 `Ctrl + Enter` 翻译；
- 自动 trim；
- 空输入不请求翻译；
- 支持一键清空；
- 支持一键复制译文；
- 显示原文和译文；
- 显示当前翻译状态。

### 本地数据

- 翻译历史；
- 收藏；
- 翻译缓存；
- 设置；
- 独立窗口位置和尺寸。

### 发音

V0.1 可使用浏览器 `speechSynthesis`：
- 英文原文播放；
- 单词/短句均可。

---

# 3. 浏览器与运行环境要求

## 3.1 最低版本

```text
Chrome Desktop >= 138
```

Manifest 设置：

```ts
minimum_chrome_version: '138'
```

V0.1 只正式验收：

```text
Windows 11 + 最新稳定版 Chrome
```

Edge 属于后续兼容目标，不作为 V0.1 阻塞条件。

---

# 4. 技术选型

| 模块 | 技术 |
|---|---|
| 扩展框架 | WXT |
| UI | Vue 3 |
| 编程语言 | TypeScript |
| Manifest | MV3 |
| 翻译 | Chrome Translator API |
| 语言检测 | 本地规则优先；预留 Language Detector |
| 本地数据库 | IndexedDB |
| 小型配置 | chrome.storage |
| 快捷键 | chrome.commands |
| 右键菜单 | chrome.contextMenus |
| 窗口管理 | chrome.windows |
| 页面注入 | Content Script |
| 图标 | lucide-vue-next |
| CSS | 原生 CSS + CSS Variables |

---

# 5. 初始化工程

推荐命令：

```bash
pnpm dlx wxt@latest init
```

选择 Vue 模板。

依赖建议：

```bash
pnpm add lucide-vue-next
```

如果需要更方便地访问 IndexedDB，可选：

```bash
pnpm add idb
```

推荐使用 `idb`，避免自行维护大量 IndexedDB callback/transaction 样板。

---

# 6. 推荐项目结构

```text
translator-extension/
│
├─ entrypoints/
│  │
│  ├─ background.ts
│  ├─ content.ts
│  │
│  ├─ translator/
│  │   ├─ index.html
│  │   ├─ main.ts
│  │   ├─ App.vue
│  │   └─ style.css
│  │
│  └─ options/
│      ├─ index.html
│      ├─ main.ts
│      └─ App.vue
│
├─ components/
│  ├─ TranslationInput.vue
│  ├─ TranslationResult.vue
│  ├─ TranslationStatus.vue
│  ├─ HistoryList.vue
│  ├─ FavoriteList.vue
│  └─ ModelDownloadProgress.vue
│
├─ content-ui/
│  ├─ SelectionTrigger.ts
│  ├─ TranslationPopover.ts
│  ├─ position.ts
│  └─ styles.ts
│
├─ core/
│  ├─ translator/
│  │   ├─ provider.ts
│  │   ├─ chrome-translator-provider.ts
│  │   ├─ translator-service.ts
│  │   └─ types.ts
│  │
│  ├─ language/
│  │   ├─ classify.ts
│  │   └─ types.ts
│  │
│  ├─ messaging/
│  │   ├─ messages.ts
│  │   └─ types.ts
│  │
│  ├─ storage/
│  │   ├─ db.ts
│  │   ├─ history-repository.ts
│  │   ├─ favorite-repository.ts
│  │   ├─ cache-repository.ts
│  │   └─ settings.ts
│  │
│  └─ window/
│      └─ translator-window.ts
│
├─ composables/
│  ├─ useTranslation.ts
│  ├─ useHistory.ts
│  └─ useSettings.ts
│
├─ types/
│  └─ built-in-ai.d.ts
│
├─ public/
│  ├─ icon-16.png
│  ├─ icon-32.png
│  ├─ icon-48.png
│  └─ icon-128.png
│
├─ wxt.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

# 7. WXT 配置

`wxt.config.ts` 建议：

```ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],

  manifest: {
    name: 'Translator',
    description: 'Local-first lightweight translator',
    minimum_chrome_version: '138',

    permissions: [
      'storage',
      'contextMenus',
    ],

    action: {
      default_title: '打开翻译器',
    },

    commands: {
      'open-translator': {
        suggested_key: {
          default: 'Ctrl+Shift+L',
          mac: 'Command+Shift+L',
        },
        description: '打开翻译器',
      },
    },
  },
});
```

注意：

- 不创建 `popup` entrypoint；
- `action` 只作为图标点击入口；
- Content Script 的匹配范围由 WXT entrypoint 配置控制；
- 如果 Content Script 采用 `<all_urls>`，注意 `chrome://` 等受限页面仍无法注入。

---

# 8. 核心数据模型

## 8.1 TranslationRequest

```ts
export interface TranslationRequest {
  id: string;
  text: string;
  sourceLanguage: 'en';
  targetLanguage: 'zh';
  source: 'window' | 'selection' | 'context-menu';
  createdAt: number;
}
```

## 8.2 TranslationResult

```ts
export interface TranslationResult {
  requestId: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: 'en';
  targetLanguage: 'zh';
  provider: 'chrome-translator';
  cached: boolean;
  durationMs: number;
  createdAt: number;
}
```

## 8.3 TranslationError

```ts
export type TranslationErrorCode =
  | 'API_UNSUPPORTED'
  | 'PAIR_UNAVAILABLE'
  | 'MODEL_DOWNLOAD_FAILED'
  | 'TRANSLATION_FAILED'
  | 'ABORTED'
  | 'INVALID_INPUT';

export interface TranslationError {
  code: TranslationErrorCode;
  message: string;
  cause?: unknown;
}
```

---

# 9. Provider 抽象

必须从第一版就抽象。

```ts
export interface TranslateOptions {
  sourceLanguage: 'en';
  targetLanguage: 'zh';
  signal?: AbortSignal;
  onDownloadProgress?: (progress: number) => void;
}

export interface TranslatorProvider {
  readonly id: string;

  availability(
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string>;

  translate(
    text: string,
    options: TranslateOptions,
  ): Promise<string>;
}
```

V0.1：

```text
TranslatorProvider
        │
        └─ ChromeTranslatorProvider
```

后续可扩展：

```text
GeminiProvider
AzureProvider
DeepLProvider
LocalModelProvider
```

但 V0.1 不实现。

---

# 10. Chrome Translator API 封装

Built-in AI API 的具体类型可能尚未完整进入 TypeScript 默认 DOM lib，因此统一放：

```text
types/built-in-ai.d.ts
```

示意声明：

```ts
interface TranslatorCreateOptions {
  sourceLanguage: string;
  targetLanguage: string;
  signal?: AbortSignal;
  monitor?: (monitor: EventTarget) => void;
}

interface TranslatorInstance {
  translate(text: string, options?: { signal?: AbortSignal }): Promise<string>;
  destroy?(): void;
}

interface TranslatorConstructor {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string>;

  create(options: TranslatorCreateOptions): Promise<TranslatorInstance>;
}

declare const Translator: TranslatorConstructor;
```

不要过度模拟 Chrome 类型，只补当前工程需要的最小类型。

---

# 11. ChromeTranslatorProvider 实现要求

## 11.1 availability

```ts
async availability(
  sourceLanguage: string,
  targetLanguage: string,
) {
  if (!('Translator' in globalThis)) {
    return 'unsupported';
  }

  return Translator.availability({
    sourceLanguage,
    targetLanguage,
  });
}
```

注意：

Chrome Built-in AI API 的 availability 返回值可能随当前 Chrome API 版本使用：

```text
available
downloadable
downloading
unavailable
```

实现时必须以当前 Chrome Stable 实际 API 返回值为准，不允许硬编码错误枚举。

---

## 11.2 create / 下载模型

创建 Translator：

```ts
const translator = await Translator.create({
  sourceLanguage: 'en',
  targetLanguage: 'zh',

  monitor(monitor) {
    monitor.addEventListener('downloadprogress', (event: Event) => {
      const progressEvent = event as ProgressEvent;
      // 将 loaded 转成 0~1
    });
  },
});
```

要求：

- UI 显示“正在准备本地翻译模型”；
- 显示百分比；
- 下载失败时提供重试；
- 翻译期间禁止重复创建多个同语言对 Translator；
- 在页面生命周期内缓存 Translator 实例；
- 页面销毁时如 API 支持 `destroy()`，主动释放。

---

# 12. TranslatorService

业务层不要直接依赖 Chrome API。

```ts
export class TranslatorService {
  constructor(
    private readonly provider: TranslatorProvider,
    private readonly cacheRepository: CacheRepository,
  ) {}

  async translate(
    request: TranslationRequest,
    options?: {
      signal?: AbortSignal;
      onDownloadProgress?: (progress: number) => void;
    },
  ): Promise<TranslationResult> {
    // 1. normalize
    // 2. cache lookup
    // 3. provider translate
    // 4. cache save
    // 5. history save
    // 6. return result
  }
}
```

流程：

```text
输入
 ↓
normalize
 ↓
空文本？
 ├─ 是 → INVALID_INPUT
 └─ 否
 ↓
计算缓存 Key
 ↓
IndexedDB 查询
 ├─ 命中 → 直接返回
 └─ 未命中
 ↓
ChromeTranslatorProvider
 ↓
写 Cache
 ↓
写 History
 ↓
返回
```

---

# 13. 文本 normalize

至少：

```ts
export function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .trim();
}
```

不要：
- 自动 lower-case；
- 删除标点；
- 改变代码标识符；
- 合并所有空格。

因为短句中的格式可能影响语义。

---

# 14. 缓存 Key

建议：

```text
sourceLanguage
+
targetLanguage
+
normalizedText
+
providerId
```

计算 hash。

例如：

```ts
const keySource =
  `en|zh|chrome-translator|${normalizedText}`;
```

可以使用 Web Crypto SHA-256。

---

# 15. IndexedDB 设计

数据库名：

```text
translator_db
```

版本：

```text
1
```

Object Stores：

## 15.1 translations

```ts
interface TranslationCacheEntity {
  id: string;          // hash
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  provider: string;
  createdAt: number;
  lastUsedAt: number;
  hitCount: number;
}
```

Indexes：
- `lastUsedAt`
- `createdAt`

## 15.2 history

```ts
interface HistoryEntity {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  source: 'window' | 'selection' | 'context-menu';
  createdAt: number;
}
```

Index：
- `createdAt`

## 15.3 favorites

```ts
interface FavoriteEntity {
  id: string;
  sourceText: string;
  translatedText: string;
  createdAt: number;
}
```

---

# 16. 历史策略

V0.1：

- 默认保存最近 500 条；
- 新记录插入后异步清理超限旧记录；
- 相同原文短时间重复翻译可只更新时间，不必无限新增；
- 设置页提供：
  - 清空历史；
  - 清空缓存；
  - 清空收藏。

---

# 17. 独立窗口管理

文件：

```text
core/window/translator-window.ts
```

常量：

```ts
const DEFAULT_BOUNDS = {
  width: 460,
  height: 680,
};
```

## 17.1 单实例逻辑

实现：

```ts
export async function ensureTranslatorWindow(): Promise<number> {
  const state = await loadTranslatorWindowState();

  if (state.windowId != null) {
    try {
      const existing = await chrome.windows.get(state.windowId);

      if (existing.id != null) {
        await chrome.windows.update(existing.id, {
          focused: true,
        });

        return existing.id;
      }
    } catch {
      // stale id
    }
  }

  const created = await chrome.windows.create({
    url: chrome.runtime.getURL('/translator.html'),
    type: 'popup',
    focused: true,
    width: state.width ?? 460,
    height: state.height ?? 680,
    left: state.left,
    top: state.top,
  });

  if (created?.id == null) {
    throw new Error('Unable to create translator window');
  }

  await saveWindowId(created.id);

  return created.id;
}
```

WXT 实际生成的 translator 页面 URL 以构建结果为准。实现者必须使用 WXT 推荐的 entrypoint URL 方式，不要假设打包路径。

---

# 18. 保存窗口 Bounds

监听：

```ts
chrome.windows.onBoundsChanged.addListener(...)
```

只保存翻译窗口。

状态：

```ts
interface TranslatorWindowState {
  windowId?: number;
  left?: number;
  top?: number;
  width?: number;
  height?: number;
}
```

存到：

```text
chrome.storage.local
```

Key：

```text
translatorWindow
```

窗口关闭：

```ts
chrome.windows.onRemoved.addListener(async (windowId) => {
  const state = await loadTranslatorWindowState();

  if (state.windowId === windowId) {
    await clearTranslatorWindowId();
  }
});
```

Bounds 写入建议 debounce 200~500ms。

---

# 19. Background Service Worker

职责严格限定为：

```text
1. chrome.action.onClicked
2. chrome.commands.onCommand
3. chrome.contextMenus 初始化
4. chrome.contextMenus.onClicked
5. ensureTranslatorWindow
6. 保存 pending request
7. 消息协调
8. 窗口状态
```

禁止：

```text
Background -> Translator.create()
```

---

# 20. Action 点击

```ts
chrome.action.onClicked.addListener(async () => {
  await ensureTranslatorWindow();
});
```

不要配置 `default_popup`。

---

# 21. 快捷键

Manifest command：

```text
open-translator
```

监听：

```ts
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'open-translator') {
    await ensureTranslatorWindow();
  }
});
```

用户以后可在：

```text
chrome://extensions/shortcuts
```

自定义快捷键。

---

# 22. 右键菜单

安装时初始化：

```ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '翻译所选文本',
    contexts: ['selection'],
  });
});
```

点击：

```ts
chrome.contextMenus.onClicked.addListener(
  async (info) => {
    if (
      info.menuItemId !== 'translate-selection' ||
      !info.selectionText?.trim()
    ) {
      return;
    }

    await queueTranslationRequest({
      text: info.selectionText,
      source: 'context-menu',
    });

    await ensureTranslatorWindow();
  },
);
```

---

# 23. 消息设计

不要在项目里散落字符串消息。

统一：

```ts
export type RuntimeMessage =
  | {
      type: 'OPEN_TRANSLATOR';
    }
  | {
      type: 'TRANSLATE_IN_WINDOW';
      payload: {
        text: string;
        source: 'selection' | 'context-menu';
      };
    }
  | {
      type: 'TRANSLATOR_WINDOW_READY';
    };
```

---

# 24. pending translation 解决初始化竞态

问题：

```text
background 创建窗口
↓
马上 sendMessage
↓
translator 页面尚未加载
↓
消息丢失
```

禁止依赖“sleep 500ms”。

正确做法：

```text
Background
↓
保存 pendingTranslation
↓
创建 / 聚焦窗口
↓
translator 页面 mount
↓
读取 pendingTranslation
↓
消费并删除
```

pending 数据可存：

```text
chrome.storage.session
```

结构：

```ts
interface PendingTranslation {
  id: string;
  text: string;
  source: 'selection' | 'context-menu';
  createdAt: number;
}
```

同时窗口已经 Ready 时可直接 runtime messaging。

---

# 25. Content Script

核心职责：

```text
Selection
↓
[译] Trigger
↓
Translation Popover
↓
与独立窗口通信
```

不要让 Vue 挂载整个网页 UI。

划词按钮/Popover 很小，可用：
- 原生 DOM；
- 或一个独立 Shadow DOM root。

推荐：

```text
Content Script
↓
创建固定 Shadow DOM Host
↓
按钮和浮层全部放 Shadow DOM
```

优点：
- 避免网页 CSS 污染插件 UI；
- 避免插件 CSS 污染网页；
- 生命周期更好管理。

---

# 26. Shadow DOM Host

例如：

```ts
const host = document.createElement('div');
host.id = '__translator_extension_root__';

const shadow = host.attachShadow({
  mode: 'open',
});

document.documentElement.appendChild(host);
```

host 使用：

```css
position: fixed;
z-index: 2147483647;
pointer-events: none;
```

按钮/Popover 自身：

```css
pointer-events: auto;
```

---

# 27. 划词检测

监听：

```text
mouseup
```

必要时补：

```text
selectionchange
```

主要流程：

```ts
document.addEventListener('mouseup', handleMouseUp, true);
```

在 handler 中：

```ts
const selection = window.getSelection();

if (!selection || selection.isCollapsed) {
  hideSelectionTrigger();
  return;
}

const text = selection.toString().trim();

if (!text) {
  hideSelectionTrigger();
  return;
}
```

限制建议：

```text
最大划词长度 V0.1 = 1000 chars
```

超出后：

```text
当前版本仅支持短文本翻译
```

避免用户误选整个网页。

---

# 28. 不处理的选择场景

V0.1 可以主动排除：

```text
INPUT
TEXTAREA
contenteditable
```

原因：
- 编辑器内部 selection 定位更复杂；
- 容易影响用户输入。

可以在 V0.2 再支持。

如果选中元素位于上述节点，先不展示 `[译]`。

---

# 29. Selection Trigger 位置

使用 Selection Range：

```ts
const range = selection.getRangeAt(0);
const rect = range.getBoundingClientRect();
```

触发按钮推荐显示在：

```text
选区右下方 + 6~8px
```

考虑：
- viewport 边界；
- 如果右侧放不下，向左；
- 底部放不下，放选区上方。

Content UI root 是 `position: fixed`，因此 Range 的 viewport 坐标可以直接使用。

---

# 30. `[译]` 按钮 UI

尺寸：

```text
28 x 28
```

要求：
- 不透明；
- 高对比；
- 圆角 6~8px；
- 不用渐变；
- 不用玻璃拟态；
- Hover 有轻微背景变化；
- 不要大面积阴影。

文本可直接：

```text
译
```

---

# 31. 点击 `[译]` 后

一定要保存当前 selection 文本，因为点击按钮后页面 selection 可能变化。

```text
mouseup
↓
保存 selectedText
↓
显示 Trigger
↓
click Trigger
↓
使用保存的 selectedText
```

不要再次依赖 `window.getSelection()`。

---

# 32. Content Script 的 Translator 实例

Content Script 中如当前 Chrome 环境允许 Translator API，则由 Content Script 自己维护：

```ts
let translatorPromise:
  Promise<TranslatorInstance> | null = null;
```

避免每次点击都重新：

```ts
Translator.create(...)
```

需要注意：

- 如果 Chrome 对特定扩展上下文的 Built-in AI API 可用性与页面隔离环境存在限制，应改为由隐藏的扩展页面/独立翻译页执行，再通过消息返回；
- 但 **仍然不允许放到 MV3 Background Service Worker 中**；
- 实施过程中必须用目标 Chrome Stable 进行实际验证，并将兼容层集中在 provider 中。

建议优先实测：

```text
Content Script isolated world 是否存在 globalThis.Translator
```

如不存在，则将 Content Script 请求转发给当前已打开的 Translator extension page；如果没有窗口，可创建一个 offscreen/extension page 方案，但必须以 Chrome 官方对 Built-in AI API 的实际支持上下文为准，不能自行猜测。

V0.1 验收重点：最终网页划词功能必须稳定工作，而不是强制某一种内部执行上下文。

---

# 33. Translation Popover

Popover 内容：

```text
┌─────────────────────────────┐
│ The property is read-only.  │
│                             │
│ 此属性为只读。               │
│                             │
│ [复制]             [↗ 打开] │
└─────────────────────────────┘
```

状态：

```text
idle
preparing-model
translating
success
error
```

模型下载时：

```text
正在准备本地翻译模型
████████░░ 80%
```

---

# 34. Popover 隐藏规则

以下情况隐藏：

- 点击 Popover 外；
- Esc；
- 新 selection；
- selection 清空；
- 页面导航；
- Content Script 被销毁。

滚动时建议：

```text
如果 Popover 已展示结果：
  保持 fixed 坐标或关闭；
```

V0.1 最简单可靠方案：

```text
页面 scroll => 隐藏 Trigger 和 Popover
```

不要实时跟随选区。

---

# 35. 独立翻译窗口 UI

推荐布局：

```text
┌────────────────────────────────────┐
│ Translator                    ⚙    │
│ English → 简体中文                  │
├────────────────────────────────────┤
│                                    │
│ 输入英文...                         │
│                                    │
│                          [清空]     │
├────────────────────────────────────┤
│                                    │
│ 翻译结果                            │
│                                    │
│                                    │
│                         [🔊] [复制] │
├────────────────────────────────────┤
│ 历史                     收藏       │
└────────────────────────────────────┘
```

不要模仿 Google Translate 大网页。

风格：

```text
轻量
克制
低噪声
高信息密度
```

---

# 36. 独立窗口输入行为

建议：

```text
Ctrl + Enter => 翻译
```

是否输入即自动翻译：

```text
V0.1 不做逐字符实时请求
```

可做 debounce 800ms 自动翻译，但默认建议：

```text
粘贴后自动翻译
或 Ctrl+Enter
```

实现优先稳定，不做复杂输入法判断。

---

# 37. 翻译取消

每次新翻译前：

```ts
currentAbortController?.abort();

currentAbortController =
  new AbortController();
```

传入 Provider。

避免：

```text
旧请求晚返回
↓
覆盖新结果
```

同时用 requestId 防止 stale response。

---

# 38. 发音

使用：

```ts
speechSynthesis.speak(
  new SpeechSynthesisUtterance(text),
);
```

原文为英文：

```ts
utterance.lang = 'en-US';
```

停止：

```ts
speechSynthesis.cancel();
```

V0.1 不下载音频。

---

# 39. 文本类型分类

V0.1 虽然所有翻译仍走 Chrome Translator，但 UI 可区分：

```text
word
phrase
sentence
```

简单规则：

```ts
export function classifyText(text: string) {
  const value = text.trim();

  if (/^[A-Za-z][A-Za-z'-]*$/.test(value)) {
    return 'word';
  }

  if (
    value.length <= 80 &&
    !/[.!?。！？]$/.test(value)
  ) {
    return 'phrase';
  }

  return 'sentence';
}
```

此分类只是 UI/后续词典入口，不用于决定语言。

---

# 40. 语言策略

V0.1 目标明确：

```text
en -> zh
```

因此：

- 单词/短句默认都按英文处理；
- 如果输入明显包含大量中文，提示：
  - “V0.1 当前仅支持英文 -> 简体中文”
- 不需要每次调用 Language Detector。

这是更可靠、更简单的实现。

后续 V0.2 再加入：
- zh -> en；
- ja -> zh；
- 自动语言识别。

---

# 41. 错误状态设计

必须给用户可理解的信息。

## Chrome 太旧

```text
当前 Chrome 版本不支持本地翻译 API。
请升级到 Chrome 138 或更高版本。
```

## API 不存在

```text
当前浏览器环境暂不支持 Translator API。
```

## 语言模型不可用

```text
当前设备无法使用英文 → 简体中文本地翻译模型。
```

## 下载失败

```text
翻译模型下载失败。

[重试]
```

## 翻译异常

```text
翻译失败，请重试。
```

Developer Console 记录详细错误，UI 不展示堆栈。

---

# 42. 设置页面

V0.1 设置项尽量少：

```text
外观
  跟随系统 / 浅色 / 深色

网页划词
  [x] 启用划词按钮

历史
  [清空历史]

缓存
  [清空翻译缓存]

收藏
  [清空收藏]

快捷键
  打开 chrome://extensions/shortcuts
```

不要加入 API Provider 设置。

---

# 43. CSS Design Tokens

建议：

```css
:root {
  --bg: #ffffff;
  --surface: #f7f7f7;
  --text: #161616;
  --text-secondary: #707070;
  --border: #e7e7e7;
  --radius-sm: 6px;
  --radius-md: 10px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
}
```

暗色通过：

```css
@media (prefers-color-scheme: dark) {}
```

若设置选择覆盖系统，则 root class：

```text
theme-light
theme-dark
```

---

# 44. 性能要求

V0.1 目标：

- 扩展安装后不持续高 CPU；
- Content Script 不高频轮询；
- 不使用 MutationObserver 扫描整个页面；
- Selection 相关事件 handler 轻量；
- 翻译缓存命中响应接近即时；
- 同一个页面语言对只保留一个 Translator 实例；
- IndexedDB 不在每次 mousemove 中访问。

---

# 45. 隐私设计

因为核心翻译走本地 Translator API：

- 不建设服务端；
- 不上传历史记录；
- 不上传收藏；
- 不上传缓存；
- 不收集遥测；
- 不接第三方统计 SDK。

README 中明确说明：

```text
核心翻译使用 Chrome 内置 Translator API；
翻译历史和收藏仅存储在本地浏览器。
```

---

# 46. 安全要求

- 不使用 `eval`；
- 不使用 `new Function`；
- Content Script 不执行网页来源的 JS；
- 网页文本只作为纯字符串处理；
- Popover 结果必须通过 `textContent` / Vue interpolation 渲染；
- 禁止使用未过滤的 `innerHTML`；
- CSP 保持 MV3 默认安全策略；
- 禁止从 CDN 动态加载 JS。

---

# 47. 测试文本

至少准备以下测试：

## 单词

```text
deprecated
underlying
render
pipeline
binding
scope
closure
mount
hydrate
```

## 技术短语

```text
render pipeline
feature flag
breaking change
read-only property
lazy loading
```

## 技术短句

```text
This API has been deprecated.

This property is read-only.

The request was aborted by the client.

The component is mounted lazily.

This feature is not supported yet.

The value is cached for subsequent requests.
```

## 普通短句

```text
I didn't mean it that way.

It's not a big deal.

That makes sense.

I'm not sure what you mean.
```

---

# 48. 功能验收标准

## 48.1 独立窗口

- [ ] 点击扩展图标打开独立窗口；
- [ ] 连续点击不会创建多个窗口；
- [ ] 已打开时会聚焦；
- [ ] `Ctrl + Shift + L` 可以打开/聚焦；
- [ ] 窗口 resize 后关闭；
- [ ] 再打开恢复尺寸；
- [ ] 窗口移动后关闭；
- [ ] 再打开恢复位置。

## 48.2 翻译

- [ ] Chrome 138+ 可检测 Translator；
- [ ] `en -> zh` availability 正确处理；
- [ ] 首次模型准备有进度 UI；
- [ ] `deprecated` 可以翻译；
- [ ] 技术短句可以翻译；
- [ ] 连续翻译不会频繁 recreate Translator；
- [ ] 新请求能取消旧请求；
- [ ] 缓存命中不重新调用 Provider；
- [ ] 翻译结果写入历史。

## 48.3 划词

- [ ] 普通网页选中文本出现 `[译]`；
- [ ] 空 selection 不显示；
- [ ] 点击 `[译]` 正确翻译；
- [ ] Popover 不受网页 CSS 明显污染；
- [ ] 点击复制成功；
- [ ] 点击“打开”将文本送到独立窗口；
- [ ] Esc 关闭；
- [ ] scroll 后浮层不会残留在错误位置；
- [ ] 超长文本不会直接翻译。

## 48.4 右键

- [ ] selection 上右键可看到“翻译所选文本”；
- [ ] 点击后打开/聚焦独立窗口；
- [ ] 文本自动进入输入区；
- [ ] 自动发起翻译。

## 48.5 数据

- [ ] 历史持久化；
- [ ] 收藏持久化；
- [ ] 缓存持久化；
- [ ] 清空操作有效；
- [ ] 浏览器重启后数据仍在。

---

# 49. 开发阶段拆分

AI Agent 必须按阶段实施，不要一次完成所有模块后再测试。

## Phase 1：工程骨架

完成：

```text
WXT
Vue3
TypeScript
Manifest V3
Action
独立 translator page
```

验收：

```text
点击扩展图标
↓
独立窗口成功打开
```

---

## Phase 2：窗口单实例

完成：

```text
chrome.windows
chrome.storage.local
bounds restore
Ctrl+Shift+L
```

验收：

```text
只能存在一个翻译窗口
```

---

## Phase 3：Translator API POC

先不要做 UI。

建立：

```text
ChromeTranslatorProvider
```

验证：

```text
This API has been deprecated.
↓
成功得到中文
```

必须真实使用 Chrome Stable 验证 API。

如果此阶段 Built-in AI API 行为与文档不一致，先修正 provider，再继续。

---

## Phase 4：独立窗口翻译 UI

实现：

```text
输入
翻译
进度
结果
取消
复制
发音
```

---

## Phase 5：IndexedDB

实现：

```text
cache
history
favorites
```

---

## Phase 6：Content Script 划词

先完成：

```text
Selection
↓
[译]
```

再实现：

```text
Popover
↓
Translator
```

---

## Phase 7：跨页面通信

实现：

```text
Content Script
↓
在翻译器中打开
↓
pendingTranslation
↓
Translator Window
```

---

## Phase 8：右键菜单

实现：

```text
selection
↓
context menu
↓
translator window
```

---

## Phase 9：设置与 UI 收尾

实现：

```text
Theme
Selection enable/disable
Clear history/cache/favorites
```

---

## Phase 10：完整验收

逐项执行第 48 节验收清单。

---

# 50. AI Agent 每个 Phase 的工作要求

每完成一个阶段：

1. 运行 TypeScript 检查；
2. 运行 ESLint（如果工程已配置）；
3. 执行构建；
4. 不允许留有 TS Error；
5. 不允许留明显 console error；
6. 更新 README 的当前进度；
7. 不进入下一阶段，直到当前阶段基本可用。

推荐命令：

```bash
pnpm lint
pnpm typecheck
pnpm build
```

实际以 package.json scripts 为准。

---

# 51. ESLint / TypeScript 约束

必须：

```text
strict: true
noImplicitAny: true
noUncheckedIndexedAccess: true（推荐）
```

代码要求：

- 函数保持单一职责；
- 不写超大 Vue component；
- API 封装与 UI 分离；
- chrome API 逻辑集中；
- storage repository 集中；
- runtime message 类型集中；
- 禁止 magic strings 散落。

---

# 52. 日志策略

提供轻量 logger：

```ts
logger.debug()
logger.info()
logger.warn()
logger.error()
```

开发环境 debug 开启。

生产环境：
- 不输出 selection 原文；
- 不输出完整翻译内容；
- 错误只记录必要状态。

防止无意将用户文本写入日志。

---

# 53. V0.1 不需要做的“伪高级功能”

AI Agent 不要主动添加：

```text
流式翻译
AI 对话
多语言自动识别
多模型评分
术语 RAG
向量数据库
云数据库
账号系统
服务端代理
WebSocket
SSE
微服务
全局状态框架
大型 UI 框架
```

当前任务追求的是：

```text
可靠
快速
本地
轻量
真正可日常使用
```

---

# 54. 后续版本预留

## V0.2

```text
本地英汉词典
音标
词性
多义词
技术词汇
中 -> 英
Language Detector
```

## V0.3

```text
日 -> 中
韩 -> 中
更多语言
Provider 切换
```

## V0.4

```text
Chrome Prompt API
“解释这句话”
“解释这个技术术语”
```

## V0.5

```text
Side Panel
段落翻译
页面双语辅助
```

---

# 55. 后续本地词典接口

虽然 V0.1 暂不实现完整本地词库，但提前定义：

```ts
export interface DictionaryEntry {
  word: string;
  phonetic?: string;
  parts: Array<{
    partOfSpeech?: string;
    definitions: string[];
  }>;
}

export interface DictionaryProvider {
  lookup(word: string): Promise<DictionaryEntry | null>;
}
```

以后：

```text
TextClassifier
↓
word
↓
DictionaryProvider
+
TranslatorProvider
↓
组合成单词卡片
```

不需要改现有翻译核心。

---

# 56. 最终架构图

```text
┌──────────────────────────────────────────────────────┐
│                   Chrome Extension                   │
│                                                      │
│  ┌──────────────────┐       ┌─────────────────────┐  │
│  │   Web Page       │       │ Translator Window   │  │
│  │                  │       │                     │  │
│  │ Selection        │       │ Manual Input        │  │
│  │     ↓            │       │      ↓              │  │
│  │   [译]           │       │ Translation UI      │  │
│  │     ↓            │       │                     │  │
│  │ Popover          │       └──────────┬──────────┘  │
│  └──────┬───────────┘                  │             │
│         │                              │             │
│         └─────────────┬────────────────┘             │
│                       ↓                              │
│               Translation Core                      │
│                       │                              │
│               Cache Repository                      │
│                       │                              │
│                cache hit?                           │
│                  │       │                           │
│                yes       no                          │
│                  │       ↓                           │
│                  │ ChromeTranslatorProvider          │
│                  │       │                           │
│                  │ Chrome Translator API             │
│                  │       │                           │
│                  └───┬───┘                           │
│                      ↓                               │
│                 Translation                         │
│                      │                               │
│            ┌─────────┼──────────┐                    │
│            ↓         ↓          ↓                    │
│          Cache     History   Favorites               │
│             \         |         /                     │
│                 IndexedDB                            │
│                                                      │
│ Background Service Worker                           │
│   ├─ chrome.action                                  │
│   ├─ chrome.commands                                │
│   ├─ chrome.contextMenus                            │
│   ├─ chrome.windows                                 │
│   └─ messaging / pending request                    │
│                                                      │
│ IMPORTANT: Background 不执行 Translator API          │
└──────────────────────────────────────────────────────┘
```

---

# 57. 首版完成定义（Definition of Done）

只有同时满足以下条件，V0.1 才算完成：

1. 插件可在 Chrome 138+ 以开发者模式加载；
2. 无 Manifest 错误；
3. 点击扩展图标可以打开独立窗口；
4. 独立窗口保持单实例；
5. 快捷键能打开独立窗口；
6. 能使用 Chrome Translator API 完成英文 -> 中文；
7. 首次模型准备过程用户可感知；
8. 独立窗口可输入、翻译、复制、发音；
9. 网页选中文字可以点击 `[译]` 翻译；
10. 网页翻译 Popover 可正常关闭；
11. 可以将划词内容发送到独立窗口；
12. 右键翻译有效；
13. 历史记录有效；
14. 收藏有效；
15. 翻译缓存有效；
16. 浏览器重启后本地数据仍存在；
17. TypeScript 无错误；
18. Production build 成功；
19. Chrome DevTools 无持续报错；
20. 不依赖任何用户自己的服务器或第三方翻译 API。

---

# 58. AI Coding Agent 首条实施指令

将本 Markdown 文档放到项目根目录，例如：

```text
docs/translator-extension-v0.1.md
```

然后给 AI Agent 以下指令：

> 阅读 `docs/translator-extension-v0.1.md` 全文，并严格按照文档实施。  
> 不要一次实现全部功能，必须从 Phase 1 开始，按 Phase 顺序逐阶段实施和验证。  
> 文档中的“实施总则”和“禁止项”属于强制约束，不得自行改变技术路线。  
> 每个 Phase 完成后，先运行 typecheck/build，并修复当前阶段问题，再进入下一阶段。  
> 遇到 Chrome Translator API / WXT API 的版本差异时，优先核对当前官方文档和本机 Chrome Stable 的实际行为，不要凭旧知识猜测。  
> 不要引入服务器、OpenAI、Gemini、DeepL、Azure 或任何第三方翻译 API。

---

# 59. 官方资料

实施时优先参考当前官方文档，不依赖过时博客：

- Chrome Built-in AI APIs  
  https://developer.chrome.com/docs/ai/built-in-apis

- Chrome Translator API  
  https://developer.chrome.com/docs/ai/translator-api

- chrome.windows  
  https://developer.chrome.com/docs/extensions/reference/api/windows

- chrome.commands  
  https://developer.chrome.com/docs/extensions/reference/api/commands

- chrome.contextMenus  
  https://developer.chrome.com/docs/extensions/reference/api/contextMenus

- chrome.storage  
  https://developer.chrome.com/docs/extensions/reference/api/storage

- Chrome Extensions  
  https://developer.chrome.com/docs/extensions

- WXT  
  https://wxt.dev/

- WXT Vue  
  https://wxt.dev/guide/essentials/frontend-frameworks.html

- WXT Manifest  
  https://wxt.dev/guide/essentials/config/manifest.html

---

# 60. 关键技术依据（2026-09 核对）

截至本方案编写时：

1. Chrome 官方 Built-in AI 文档列出 Translator API 对 Web 与 Extensions 均从 Chrome 138 起提供。
2. `chrome.windows.create()` 支持创建 `type: "popup"` 的独立浏览器窗口，并支持 URL、width、height、left、top、focused 等参数。
3. `chrome.commands` 可以定义扩展快捷键，用户可在 `chrome://extensions/shortcuts` 自定义。
4. `chrome.contextMenus` 支持 `selection` 上下文，用于“翻译所选文本”。
5. WXT 支持 Vue 模块，并从配置/entrypoints 自动生成 MV3 Manifest。

如果未来 Chrome API 发生变化，以官方最新 Stable 文档与实际运行结果为准。
