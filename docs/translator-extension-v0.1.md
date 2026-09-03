# 本地优先浏览器翻译插件当前实现与维护边界（V0.4）

> 面向 AI Coding Agent 的直接实施文档  
> 目标平台：Chrome Desktop 138+，优先 Windows 11；后续兼容 Edge  
> 技术栈：WXT + Vue 3 + TypeScript + Manifest V3 + Chrome Translator API + IndexedDB  
> 产品定位：个人使用的“单词 / 短语 / 短句”轻量翻译工具  
> 核心原则：本地优先、零服务端、零 API Key、翻译效果与响应速度优先

### 当前范围说明

V0.1 的独立窗口、网页划词、右键菜单、历史、收藏、缓存、设置和 Chrome 内置翻译已完成；V0.2 已完成英中双向翻译与自动语言识别；V0.3 已完成日语/韩语到中文翻译；V0.4 已接入 Chrome Translator API 官方语言目录，并由统一语言数据驱动所有语言选择器。

后续不扩展翻译 Provider、第三方 API 或 API 配置功能。词典、不在 Chrome Translator API 官方目录中的语言、Prompt API、Side Panel、段落翻译、页面双语辅助等也不作为当前阶段功能；语言目录以 Chrome 官方支持范围为准，具体语言对由运行时能力检查决定。图标优化也不属于后续开发范围。

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

4. **核心翻译直接使用 Chrome Built-in Translator API。**
    - 最低 Chrome 版本为 138。
    - 当前正式支持 Chrome Translator API 官方语言目录中的语言；语言对是否可用由运行时能力检查决定。
    - 通过内部 Chrome API 封装管理语言包、翻译实例和取消操作；不提供可配置 Provider。

5. **网页划词不要“选中即自动翻译”。**
   - 用户选中文字后，出现一个很小的 `[译]` 按钮。
   - 点击 `[译]` 才开始翻译。
   - 这样既减少误触，也满足首次语言模型创建/下载时的用户操作触发需求。

6. **独立窗口是产品主界面。**
   - 用户可直接输入单词/短句。
   - 支持历史、收藏、一键复制，以及原文和译文分别发音。
   - 网页划词只属于快速入口。

7. **本地数据使用 IndexedDB。**
   - `chrome.storage.sync` 只保存少量设置。
   - `chrome.storage.local` 保存窗口尺寸/位置等小数据。
    - 历史、收藏和翻译缓存使用 IndexedDB；本项目不实现词典数据。

8. **不要为了 V0.1 引入 Element Plus、Pinia、RxJS 等不必要依赖。**
   - Vue 3 Composition API 即可。
    - 扩展图标使用 `public/icons/` 中的静态资源；界面内仅使用现有文本/CSS 符号。
   - 样式使用原生 CSS / CSS Variables。
   - 状态规模很小，不需要全局状态库。

9. **所有核心逻辑必须 TypeScript strict。**
   - 禁止 `any`，除非是针对尚未进入 TS lib 的 Chrome Built-in AI API 做最小范围的类型桥接。
   - 对 Built-in AI API 应单独提供类型声明文件。

10. **不要超范围实现。**
    当前不实现：
    - 本地英汉词典、音标、词性、多义词和技术词典；
    - Chrome Translator API 官方目录之外的语言；
    - Chrome Prompt API；
    - Side Panel；
    - 段落翻译；
    - 页面双语辅助；
    - 第三方翻译 API、Responses API 和 Provider 配置/切换；
    - 全文网页翻译；
    - PDF 翻译；
    - OCR；
    - 截图翻译；
    - 云同步；
    - 用户系统；
    - 自建服务端。

---

# 1. 产品目标

开发一个 Chrome 浏览器扩展，用于个人日常翻译：

- 英文、中文、日文和韩文的短文本；
- 软件开发相关英文；
- 浏览器网页划词；
- 独立翻译窗口手动输入。

核心体验：

```text
网页中选中文本
    ↓
出现 [译]
    ↓
点击
    ↓
网页浮层显示译文
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
直接输入短文本
    ↓
实时/手动翻译
```

---

# 2. 当前功能范围（V0.1 基线及 V0.2/V0.3/V0.4 增量）

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

- Chrome Translator API 官方语言目录中的语言作为源语言和目标语言；
- 目录中的任意两个不同语言交由 Chrome 运行时检查语言对可用性；
- 通过 Chrome Built-in Translator API 执行翻译；
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
- 点击后将文本交给独立翻译窗口，并打开或聚焦该窗口；
- 独立翻译窗口自动检测源语言并发起翻译；
- 译文、进度、复制、原文/译文发音和重试均在独立翻译窗口中完成；
- 页面侧不执行翻译，也不默认显示翻译结果浮层；
- 点击页面其他位置后隐藏按钮；
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
- 按 `Enter` 翻译；
- 按 `Shift + Enter` 换行；
- 自动 trim；
- 空输入不请求翻译；
- 支持一键清空；
- 支持一键复制译文；
- 显示译文；原文始终保留在输入区；
- 显示当前翻译状态。

### 本地数据

- 翻译历史；
- 收藏；
- 翻译缓存；
- 设置；
- 独立窗口位置和尺寸。

### 发音

V0.1 可使用浏览器 `speechSynthesis`：
- 原文区域播放输入文本，使用手动选择的源语言；
- 自动检测模式使用已确认的检测结果播放原文，检测完成前按钮不可用；
- 译文区域播放翻译结果，使用当前目标语言；
- 播放新内容前取消上一段语音，避免原文和译文重叠；
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

当前只正式验收：

```text
Windows 11 + 最新稳定版 Chrome
```

Edge 仍属于后续兼容目标，不作为当前版本阻塞条件。

---

# 4. 技术选型

| 模块 | 技术 |
|---|---|
| 扩展框架 | WXT |
| UI | Vue 3 |
| 编程语言 | TypeScript |
| Manifest | MV3 |
| 翻译 | Chrome Translator API |
| 语言检测 | 本地规则优先；Chrome Language Detector 作为兜底 |
| 本地数据库 | IndexedDB |
| 小型配置 | chrome.storage |
| 快捷键 | chrome.commands |
| 右键菜单 | chrome.contextMenus |
| 窗口管理 | chrome.windows |
| 页面注入 | Content Script |
| 图标 | `public/icons/` 静态资源 |
| CSS | 原生 CSS + CSS Variables |

---

# 5. 初始化工程

当前工程命令：

```bash
pnpm install
```

选择 Vue 模板。

当前只依赖 Vue 3、WXT、TypeScript、Vue TypeScript 检查工具和 Vitest；IndexedDB 使用工程内的 repository 封装，UI 图标使用现有文本/CSS 实现，不额外引入 `lucide-vue-next` 或 `idb`。

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
│  ├─ TranslationPopover.ts（保留，非默认链路）
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
│  │   ├─ language-detector.ts
│  │   └─ types.ts
│  │
│  ├─ messaging/
│  │   ├─ messages.ts
│  │   ├─ pending-translation.ts
│  │   └─ selection-handoff.ts
│  │
│  ├─ i18n/
│  │   └─ ui.ts
│  │
│  ├─ storage/
│  │   ├─ db.ts
│  │   ├─ history-repository.ts
│  │   ├─ favorite-repository.ts
│  │   ├─ cache-repository.ts
│  │   ├─ extension-repository.ts
│  │   └─ settings.ts
│  │
│  └─ window/
│      └─ translator-window.ts
│

│
├─ types/
│  └─ built-in-ai.d.ts
│
├─ public/
│  └─ icons/
│      ├─ icon-16.png
│      ├─ icon-32.png
│      ├─ icon-48.png
│      ├─ icon-128.png
│      └─ translator-taskbar.ico
│
├─ wxt.config.ts
├─ eslint.config.js
├─ tsconfig.json
├─ package.json
├─ pnpm-lock.yaml
├─ tests/
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

    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },

    permissions: [
      'storage',
      'contextMenus',
    ],

    action: {
      default_title: '打开翻译器',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
      },
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
- Translator 独立窗口当前通过 `entrypoints/translator/index.html` 引用 `icons/translator-taskbar.ico` 作为窗口/任务栏 favicon；
- Content Script 的匹配范围由 WXT entrypoint 配置控制；
- 如果 Content Script 采用 `<all_urls>`，注意 `chrome://` 等受限页面仍无法注入。

---

# 8. 核心数据模型

## 8.1 TranslationRequest

```ts
export interface TranslationRequest {
  id: string;
  text: string;
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
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
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
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

# 9. 翻译执行边界

本项目只有一个翻译实现：Chrome Built-in Translator API。`TranslatorService` 负责输入校验、语言对校验、缓存、历史和错误处理；Chrome API 封装负责模型创建、下载进度、翻译取消以及实例释放。

当前调用链：

```text
TranslatorService
        ↓
ChromeTranslatorProvider（内部 Chrome API 封装）
        ↓
Chrome Built-in Translator API
```

不实现 Provider Registry、第三方翻译 API、Responses API、API Key、默认 Provider 切换或请求级 Provider 选择。Background Service Worker 仍不直接执行 Translator API。

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

  const availability = await Translator.availability({
    sourceLanguage,
    targetLanguage,
  });

  return normalizeAvailability(availability);
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

实现时必须以当前 Chrome Stable 实际 API 返回值为准；当前实现会将未知值归一化为 `unknown`，不向业务层泄漏未支持的枚举。

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
    private readonly historyRepository?: HistoryRepository,
  ) {}

  async translate(
    request: TranslationRequest,
    options?: {
      signal?: AbortSignal;
      onDownloadProgress?: (progress: number) => void;
      onTranslating?: () => void;
    },
  ): Promise<TranslationResult> {
    // 1. normalize
    // 2. cache lookup
    // 3. Chrome Translator API translate
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

缓存 Key 使用固定的 Chrome Translator 实现标识、当前语言方向和规范化文本：

```text
sourceLanguage
+
targetLanguage
+
chrome-translator
+
normalizedText
```

计算 hash。

例如：

```ts
const keySource = `${sourceLanguage}|${targetLanguage}|chrome-translator|${normalizedText}`;
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
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
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
  sourceLanguage: SupportedLanguage;
  targetLanguage: SupportedLanguage;
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
  sourceLanguage?: SupportedLanguage;
  targetLanguage?: SupportedLanguage;
  createdAt: number;
}
```

---

# 16. 历史策略

当前实现：

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
  width: 440,
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
    width: state.width ?? 440,
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

Content Script 不直接访问扩展页面的 IndexedDB；当前实现通过 Background
提供缓存和历史的本地存储消息桥接。该桥接只读写本地 IndexedDB，不执行
Translator API，也不上传用户文本。

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

    await queueTranslationRequest(
      info.selectionText,
      'context-menu',
    );

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

以上展示跨页面通信的核心消息；当前实现将缓存和历史读写也纳入同一套
RuntimeMessage 类型定义。收藏只在扩展翻译窗口和设置页使用 IndexedDB，
因为 Content Script 没有收藏操作，不额外增加收藏消息。

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
translator 页面发送 READY，Background 将 pendingTranslation 发送给页面
↓
Background 在发送成功后消费并删除
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
TRANSLATE_IN_WINDOW
↓
Background pending/runtime messaging
↓
独立翻译窗口自动检测并翻译
```

不要让 Vue 挂载整个网页 UI。

划词按钮很小，可用：
- 原生 DOM；
- 或一个独立 Shadow DOM root。

推荐：

```text
Content Script
↓
创建固定 Shadow DOM Host
↓
按钮放 Shadow DOM
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
当前最大划词长度 = 1000 chars
```

超出后：

```text
当前版本仅支持短文本翻译
```

避免用户误选整个网页。

---

# 28. 不处理的选择场景

当前主动排除：

```text
INPUT
TEXTAREA
contenteditable
```

原因：
- 编辑器内部 selection 定位更复杂；
- 容易影响用户输入。

当前仍不支持这些可编辑元素，避免影响用户输入；后续维护也不默认扩展该范围。

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

# 32. Translator 实例的执行上下文

当前实现中，只有独立翻译窗口维护 Chrome Translator API 封装实例。Content Script
只负责选区触发器和发送 `TRANSLATE_IN_WINDOW` 消息，不执行翻译：

```ts
let translatorPromise:
  Promise<TranslatorInstance> | null = null;
```

避免每次点击都重新：

```ts
Translator.create(...)
```

独立翻译窗口在页面侧执行，不通过 Background Service Worker 调用 Translator API；如果当前上下文不支持 API，则向用户显示不可用错误，不实现 offscreen 或隐藏页面 fallback。

网页划词通过 Background 的 pending translation 处理窗口初始化竞态，最终交由独立窗口完成自动检测和翻译。

---

# 33. 网页划词默认不显示翻译 Popover

网页划词点击 `[译]` 后只负责把选中文本交给独立翻译窗口：

```text
Selection → [译] → 独立翻译窗口
```

独立窗口负责以下状态和操作：

```text
自动检测源语言
准备本地翻译模型
翻译中 / 成功 / 失败
复制 / 发音 / 重试
```

当前默认链路不在网页侧创建 `TranslationPopover`。如未来重新启用网页结果浮层，
需要单独评估与独立窗口之间的状态同步，不应让它重新成为默认翻译入口。

模型下载时，独立窗口显示：

```text
正在准备本地翻译模型
████████░░ 80%
```

---

# 34. 网页侧 Trigger 隐藏规则

以下情况隐藏：

- Esc；
- 新 selection；
- selection 清空；
- 页面导航；
- Content Script 被销毁。

滚动时：

```text
隐藏 Trigger；
```

不要实时跟随选区，也不要在网页侧保留翻译结果。

---

# 35. 独立翻译窗口 UI

推荐布局：

```text
┌────────────────────────────────────┐
│ Translator                    ⚙    │
│ 自动检测       简体中文             │
├────────────────────────────────────┤
│                                    │
│ 输入短文本...                       │
│ [🔊]                         [翻译] │
├────────────────────────────────────┤
│                                    │
│ 翻译结果                            │
│                                    │
│                                    │
│                    [🔊] [收藏] [复制] │
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
Enter => 翻译
Shift + Enter => 换行
```

是否输入即自动翻译：

```text
V0.1 不做逐字符实时请求
```

可做 debounce 800ms 自动翻译，但默认建议：

```text
粘贴后自动翻译
或 Enter
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

传入 Chrome API 封装。

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

原文和译文使用不同的播放入口：

```text
原文区域 [播放原文] → 输入文本 + 源语言
译文区域 [播放译文] → 翻译结果 + 目标语言
```

发音语言规则：

- 手动源语言：使用当前源语言；
- 自动检测源语言：使用已完成检测的语言；检测未完成或检测失败时禁用原文按钮；
- 译文：使用当前目标语言。

统一播放函数：

```ts
function speakText(text: string, language: SupportedLanguage): void {
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = languageSpeechLocale(language);
  speechSynthesis.speak(utterance);
}
```

停止：

```ts
speechSynthesis.cancel();
```

V0.1 不下载音频。

---

# 39. 文本类型辅助规则

V0.1 虽然所有翻译仍走 Chrome Translator，工程保留文本类型辅助规则，
但当前翻译窗口不再显示类型标签：

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

此分类不用于决定语言，也不代表已实现词典能力；当前界面不展示该分类结果。

---

# 40. 语言策略

当前支持的语言和语言对由 `core/translator/languages.ts` 统一定义：

源语言和目标语言选择器使用同一组具体语言：

```text
ar / bg / bn / cs / da / de / el / en / es / fi / fr / he / hi / hr /
hu / id / it / ja / kn / ko / lt / mr / nl / no / pl / pt / ro / ru /
sk / sl / sv / ta / te / th / tr / uk / vi / zh / zh-Hant
```

界面语言选择器直接使用同一份完整目录，不再维护 `interfaceAvailable` 筛选字段。
目录中的 39 种语言均有界面本地化文案，因而可同时作为界面语言、源语言和目标语言。

源语言额外支持 `auto` 自动检测。目标语言不显示 `auto`。选择器展示完整语言集合，实际不可用的语言对仍由翻译服务校验并显示明确错误。

翻译服务允许目录中的任意两个不同语言作为请求语言对，不再维护手工白名单。
Chrome `Translator.availability()` 是语言对和本地模型可用性的最终判断来源；
如果当前设备不支持该语言对，界面显示明确的不可用提示。

独立翻译窗口支持：

- 手动选择源语言和目标语言；
- 自动检测源语言；
- 源语言默认是 `auto` 自动检测，目标语言默认跟随已保存的界面显示语言（初始默认中文 `zh`）；
- 自动检测只解析源语言，不自动修改用户选择的目标语言；
- 仅允许目录中的语言，禁止相同语言互译；具体语言对可用性由 Chrome 运行时检查。

语言识别采用混合策略：

- 中文、日文、韩文、阿拉伯文、希伯来文等具有独立文字特征的语言由本地规则优先识别；
- 普通拉丁字母文本交给 Chrome Language Detector API，并保留排序后的候选语言；
- 普通文本要求最高候选置信度至少为 0.55，且与第二候选有至少 0.10 的差值；
- 单词和短文本使用 0.40 的最低置信度和 0.15 的候选差值，置信度达到 0.65 时可直接接受；
- 不再维护 dog、cat 等英文硬编码词表；
- 无法确认时，独立窗口展示最多 3 个候选语言，用户可以点击候选后继续翻译；
- Chrome Language Detector 不可用或没有候选时，保留原文并要求手动选择源语言。

网页划词默认交给独立窗口自动检测语言。

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
当前设备无法使用当前语言方向的本地翻译模型。
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

UI 不展示错误堆栈，也不输出用户原文或完整译文日志。

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
  列表项支持单独删除

缓存
  [清空翻译缓存]

收藏
  [清空收藏]
  列表项支持单独删除

快捷键
  打开 chrome://extensions/shortcuts
```

界面语言在独立翻译窗口顶部下拉框切换，使用与源语言、目标语言相同的 39 项目录，
并保存到 `translatorSettings.displayLanguage`。切换界面语言时，目标语言同步为相同的
语言代码；界面语言扩展不会额外改变翻译语言对校验。

不要加入第三方 API 或 Provider 设置。

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

当前性能要求：

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

以下清单描述当前版本的验收项目；勾选状态仅代表实际验收记录，不因文档同步自动视为已完成。

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
- [ ] 目录中的不同语言对交由 Chrome `Translator.availability()` 检查并正确处理；
- [ ] 自动语言识别和手动源语言选择均可用；
- [ ] 首次模型准备有进度 UI；
- [ ] `deprecated` 可以翻译；
- [ ] 技术短句可以翻译；
- [ ] 连续翻译不会频繁 recreate Translator；
- [ ] 新请求能取消旧请求；
- [ ] 缓存命中不重新调用 Chrome Translator API；
- [ ] 翻译结果写入历史。

## 48.3 划词

- [ ] 普通网页选中文本出现 `[译]`；
- [ ] 空 selection 不显示；
- [ ] 点击 `[译]` 打开或聚焦独立翻译窗口；
- [ ] 选中文本自动进入独立窗口输入区；
- [ ] 独立窗口自动检测源语言并发起翻译；
- [ ] Esc 关闭；
- [ ] scroll 后 Trigger 不会残留在错误位置；
- [ ] 超长文本不会直接翻译，并显示短文本限制提示。

## 48.4 右键

- [ ] selection 上右键可看到“翻译所选文本”；
- [ ] 点击后打开/聚焦独立窗口；
- [ ] 文本自动进入输入区；
- [ ] 自动发起翻译。

## 48.5 数据

- [ ] 历史持久化；
- [ ] 收藏持久化；
- [ ] 单条历史和收藏删除有效；
- [ ] 缓存持久化；
- [ ] 清空操作有效；
- [ ] 浏览器重启后数据仍在。

## 48.6 发音

- [ ] 原文区域可以播放输入文本；
- [ ] 原文播放使用手动源语言或已完成的自动检测语言；
- [ ] 自动检测未完成或失败时，原文播放按钮不可用；
- [ ] 译文区域可以播放翻译结果；
- [ ] 译文播放使用当前目标语言；
- [ ] 播放新内容会先停止上一段语音。

---

# 49. 开发阶段拆分

以下阶段是历史实施记录。当前工程已完成 Phase 1～10，以及 V0.2/V0.3/V0.4 中已实现的语言能力扩展；新增工作只按第 54 节的维护范围执行。

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

建立 Chrome API 封装：

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

如果此阶段 Built-in AI API 行为与文档不一致，先修正 Chrome API 封装，再继续。

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
播放原文
播放译文
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

完成：

```text
Selection
↓
[译]
↓
TRANSLATE_IN_WINDOW
↓
Translator Window
```

网页侧不默认创建翻译 Popover；翻译状态和结果统一在独立窗口中处理。

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

当前工程验证命令：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm zip
```

实际以 `package.json` scripts 为准；当前工程已配置 `pnpm lint`，执行前需确保本地开发依赖完整。

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

当前工程不引入独立 logger。必要错误只通过 UI 的稳定错误状态处理；生产环境：

- 不输出 selection 原文；
- 不输出完整翻译内容；
- 不记录 API Key 或请求内容。

防止无意将用户文本写入日志。

---

# 53. V0.1 阶段不需要做的“伪高级功能”

AI Agent 不要主动添加：

```text
流式翻译
AI 对话
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

# 54. 后续范围

后续不再增加词典、Provider 或其它独立产品功能；语言扩展按 Chrome 内置 Translator API 的官方语言范围逐批验证和加入，只修复和完善现有本地翻译能力。

明确不实现：

- 本地英汉词典、音标、词性、多义词和技术词典；
- Chrome Translator API 官方目录之外的语言；
- Chrome Prompt API；
- Side Panel；
- 段落翻译；
- 页面双语辅助；
- 第三方翻译 API、Responses API 和 Provider 配置/切换；
- 全文网页翻译、PDF 翻译、OCR 和截图翻译；
- 云同步、用户系统和自建服务端。

后续维护范围包括：Chrome Translator API 兼容性修复、已支持语言的语言包下载体验、分批语言验证、翻译错误处理、缓存/历史/收藏可靠性和现有界面问题。

---

# 55. 当前最终架构

```text
Translator Window / Content Script
                ↓
        TranslatorService
                ↓
 ChromeTranslatorProvider（内部 Chrome API 封装）
                ↓
      Chrome Built-in Translator API
                ↓
       Cache / History / Favorites
```

约束：

- 只使用 Chrome Built-in Translator API；
- 不提供 Provider 注册表、配置页、默认切换或请求级选择；
- 不保存或读取第三方 API Key；
- Background Service Worker 不直接调用 Translator API；
- Provider 相关文件仅作为内部 Chrome API 封装，不构成可扩展的产品功能；
- 新增需求必须先确认是否仍属于本地翻译范围，禁止借此重新引入第三方 Provider。

验收重点：

- 默认 Chrome 翻译路径无回归；
- 独立窗口、划词、右键菜单、快捷键继续可用；
- 语言包首次下载有明确进度和错误提示；
- 缓存命中不重复调用 Chrome Translator API；
- 历史、收藏和缓存仍只保存在本地；
- typecheck、test、build 和 Chrome Stable 实机验证通过。

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
│  │ TRANSLATE_IN_   │       └──────────┬──────────┘  │
│  │ WINDOW          │                  │             │
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
│                  │ ChromeTranslatorProvider         │
│                  │       │                           │
│                  │ Chrome Built-in Translator API   │
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

# 57. 当前版本完成定义（Definition of Done）

以下条件用于判断当前版本是否可交付；V0.1 的基础能力、V0.2 的英中双向翻译与自动语言识别、V0.3 的日语/韩语到中文翻译均已纳入当前实现：

1. 插件可在 Chrome 138+ 以开发者模式加载；
2. 无 Manifest 错误；
3. 点击扩展图标可以打开独立窗口；
4. 独立窗口保持单实例；
5. 快捷键能打开独立窗口；
6. 能使用 Chrome Translator API 检查并完成语言目录中可用的不同语言对翻译；
7. 支持手动选择源语言以及自动语言识别；
8. 首次模型准备过程用户可感知；
9. 独立窗口可输入、翻译、复制，并分别播放原文和译文；
10. 网页选中文字可以点击 `[译]` 翻译；
11. 网页划词可以打开/聚焦独立窗口，并自动检测源语言；
12. 独立窗口目标语言跟随已保存的界面语言；
13. 右键翻译有效；
14. 历史记录有效；
15. 收藏有效；
16. 翻译缓存有效；
17. 浏览器重启后本地数据仍存在；
18. TypeScript 无错误；
19. Production build 成功；
20. Chrome DevTools 无持续报错；
21. 不依赖任何用户自己的服务器或第三方翻译 API。

---

# 58. 维护时给 AI Coding Agent 的实施指令

维护当前工程时，先阅读本 Markdown 文档全文，并核对代码、`README.md` 与实际构建结果：

```text
docs/translator-extension-v0.1.md
```

维护要求：

> 先核对当前实现，不要重新引入第三方 API、Responses API、Provider 配置或已明确排除的功能。
> 新改动只应落在第 54 节定义的维护范围内；涉及行为变化时，先补充或调整测试。
> 修改前后运行 `pnpm typecheck`、`pnpm test`、`pnpm build`；需要交付压缩包时再运行 `pnpm zip`。
> 遇到 Chrome Translator API / WXT API 的版本差异时，优先核对当前 Chrome Stable 的官方文档和实际行为，不要凭旧知识猜测。
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
