# Chrome Web Store 公开发布资料

项目：Translator

仓库：<https://github.com/32736/translator-extension>

隐私政策：<https://github.com/32736/translator-extension/blob/main/docs/privacy-policy.md>

## 发布定位

Translator 是一个本地优先的 Chrome 翻译扩展。用户可以在独立窗口中输入短文本，也可以在网页中选择文本后按需翻译。翻译使用 Chrome 内置 Translator API，历史、收藏和缓存只保存在本地浏览器。

建议分发方式：Public。

建议类别：Productivity。

最低浏览器版本：Chrome 138 Desktop。

## Store Listing

### Name

Translator

### Short description

Local-first text translation in Chrome with selection, context-menu, history, favorites, and offline browser storage.

### 中文简介

本地优先的 Chrome 轻量翻译工具，支持独立窗口输入、网页划词、右键翻译、历史、收藏和本地缓存。

### English detailed description

Translator is a lightweight, local-first translation extension for Chrome Desktop.

Translate short text in a focused standalone window, or select text on a webpage and request a translation when you need it. Translation uses Chrome's built-in Translator API, with no developer-operated server, account, API key, or third-party translation provider.

Features:

- Standalone translator window opened from the extension icon or keyboard shortcut.
- Manual source-language selection and automatic language detection.
- English ↔ Simplified Chinese translation.
- Japanese → Simplified Chinese and Korean → Simplified Chinese translation.
- User-triggered selection translation and context-menu translation.
- Copy, speak, retry, history, favorites, and translation cache.
- Local browser storage for settings, history, favorites, and cache.
- Chinese and English interface display languages.
- Light, dark, and system theme options.

Chrome may download a local language model the first time a language pair is used. The availability of language pairs and local models depends on the Chrome installation and device environment.

### 中文详细简介

Translator 是一款面向 Chrome Desktop 的轻量、本地优先翻译扩展。

你可以在独立翻译窗口中输入短文本，也可以在网页中选择文本后按需发起翻译。翻译使用 Chrome 内置 Translator API，不依赖开发者服务器、账号、API Key 或第三方翻译服务。

功能包括：

- 从扩展图标或快捷键打开独立翻译窗口。
- 手动选择源语言，并支持自动语言识别。
- 英语 ↔ 简体中文。
- 日语 → 简体中文、韩语 → 简体中文。
- 用户主动触发的网页划词翻译和右键菜单翻译。
- 复制、朗读、重试、历史、收藏和翻译缓存。
- 设置、历史、收藏和缓存均保存在本地浏览器。
- 中文和英文页面显示语言。
- 浅色、深色和跟随系统主题。

首次使用某个语言对时，Chrome 可能下载本地语言模型。语言对和本地模型的可用性取决于 Chrome 版本及设备环境。

## Privacy practices 填写建议

### Single purpose

Provide user-requested local translation of short text in Chrome.

### Data use disclosure

建议如实选择与网页选中文本、用户输入文本和翻译结果相关的数据类别，并说明：

> The extension processes user-entered or user-selected text locally to provide the requested translation. It stores translation history, favorites, cache, and settings only in the user's browser. It does not transmit this data to the developer or third parties.

### Privacy policy URL

<https://github.com/32736/translator-extension/blob/main/docs/privacy-policy.md>

### Remote code

No. All extension logic is bundled in the submitted package. The extension does not load or execute remote code.

### Permission justifications

| 权限/范围 | 建议说明 |
| --- | --- |
| `storage` | Stores user settings and temporary cross-page/window state in Chrome storage. |
| `contextMenus` | Adds a user-triggered command to translate selected text from the context menu. |
| `content_scripts.matches: <all_urls>` | Enables the user-facing selection-translation trigger on supported webpages. The script only uses selected text when the user invokes translation; Chrome-restricted pages are not accessible. |

## Distribution

首次公开发布建议：

- Visibility：Public
- Regions：按实际发布范围选择；若无地区限制则 All regions
- Paid：No
- Test instructions：No account or special credentials required；首次翻译可能触发 Chrome 本地模型下载

## Graphic assets

`docs/store-assets/` 中的宣传插画可以作为商店宣传视觉基础，但不能替代真实功能截图。上传前应使用当前版本在 Chrome 中运行的真实界面截图，至少准备一张 1280×800 截图；另准备商店图标和宣传图。

当前已准备：

- `translator-marquee.png`：1400×560，宣传横幅视觉稿
- `translator-promo-tile.png`：440×280，小宣传图视觉稿
- `translator-marquee-source.png`：横幅源图，可继续编辑
- `translator-promo-tile-source.png`：小宣传图源图，可继续编辑

## Test instructions

1. Install the submitted package in Chrome Desktop 138 or newer.
2. Click the extension icon to open the standalone translator window.
3. Enter text, choose source and target languages, and translate.
4. Select text on a normal webpage and click the selection translation button.
5. Select text and use the context-menu translation command.
6. Verify copy, speak, history, favorites, cache, clear actions, theme, and Chinese/English display language.
7. The first use of a language pair may show Chrome's local model download progress.

No login, external server, API key, or test account is required.
