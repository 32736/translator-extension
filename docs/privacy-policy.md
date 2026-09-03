# Translator 隐私政策 / Privacy Policy

最后更新：2026-09-02

隐私政策地址：<https://github.com/32736/translator-extension/blob/main/docs/privacy-policy.md>

## 中文

### 1. 适用范围

Translator 是一个本地优先的 Chrome 扩展，用于在浏览器中按用户要求翻译短文本。扩展使用 Chrome 内置 Translator API 完成翻译，不提供服务器端翻译服务，也不要求用户登录或提供 API Key。

### 2. 处理的数据

当用户主动输入文本、使用网页划词翻译或使用右键菜单翻译时，扩展会在本地处理相关文本、源语言和目标语言，以完成翻译、显示结果和语音朗读。

扩展可能在浏览器本地保存以下数据：

- 翻译历史：原文、译文、源语言、目标语言、触发来源和时间。
- 收藏：原文、译文、语言和时间。
- 翻译缓存：原文、译文、语言、使用时间和命中次数。
- 用户设置：主题、网页划词开关和页面显示语言。
- 窗口状态：翻译窗口的尺寸、位置以及跨页面传递翻译请求所需的临时状态。

上述数据使用 IndexedDB、`chrome.storage.sync`、`chrome.storage.local` 或 `chrome.storage.session` 保存于用户的浏览器中。扩展不会将这些数据发送给开发者或第三方服务。

### 3. 网页内容和权限

为了提供用户主动触发的网页划词翻译和右键菜单翻译，扩展内容脚本会匹配网页，并在用户选择文本或点击翻译功能时读取相关选中文本。扩展不以收集浏览历史、广告投放或用户画像为目的访问网页。

扩展声明的 `storage` 权限用于保存设置和临时状态，`contextMenus` 权限用于提供“翻译所选文本”右键菜单。网页内容脚本的匹配范围用于支持不同网站上的划词翻译；Chrome 的受限页面仍无法注入内容脚本。

### 4. 翻译模型和第三方服务

翻译直接调用用户 Chrome 中可用的 Chrome Built-in Translator API。首次使用某个语言对时，Chrome 可能提示下载本地语言模型。Translator 扩展本身不运行服务器，不调用 OpenAI、Gemini、DeepL、Azure 或其他第三方翻译 API，也不包含远程代码。

### 5. 数据控制和删除

用户可以在扩展设置中清空历史、收藏和翻译缓存，也可以在翻译窗口中清空历史或收藏列表，或单独删除某一条历史记录和收藏内容。用户还可以通过 Chrome 的扩展管理页面移除扩展。扩展不提供开发者端的数据账户或云端数据副本。

### 6. 数据共享和保留

扩展不会向开发者、广告平台或其他第三方出售、出租或共享用户文本、翻译结果、网页选中文本、历史、收藏或设置。数据保留在用户主动清除、移除扩展或浏览器清理相关站点数据之前；扩展不在开发者服务器上保留数据。

### 7. 联系方式

项目地址：<https://github.com/32736/translator-extension>

如需反馈隐私问题或报告问题，请通过 GitHub Issues 联系项目维护者。

### 8. Chrome Web Store Limited Use 声明

本扩展对从 Chrome API 或网页上下文获得的信息的使用，仅限于提供和改进本扩展所声明的单一用途：用户主动请求的本地文本翻译；相关使用遵守 Chrome Web Store User Data Policy 的 Limited Use 要求。

## English

### 1. Scope

Translator is a local-first Chrome extension for translating short text on demand. It uses Chrome's built-in Translator API and does not provide a developer-operated translation server. No sign-in or API key is required.

### 2. Data processed

When a user actively enters text, requests selection translation, or uses the context-menu translation command, the extension processes the related text, source language, and target language locally to translate, display, copy, or speak the result.

The extension may store the following data locally in the browser:

- Translation history: source text, translated text, languages, trigger source, and timestamp.
- Favorites: source text, translated text, languages, and timestamp.
- Translation cache: source text, translated text, languages, usage time, and hit count.
- User settings: theme, page-selection toggle, and display language.
- Window state: translator-window bounds and temporary state used to pass translation requests between pages.

This data is stored in IndexedDB, `chrome.storage.sync`, `chrome.storage.local`, or `chrome.storage.session` in the user's browser. The extension does not send this data to the developer or any third-party service.

### 3. Web content and permissions

To provide user-triggered selection translation and context-menu translation, the content script matches web pages and reads the selected text when the user selects text or invokes a translation action. The extension does not access web pages for browsing-history collection, advertising, or profiling.

The declared `storage` permission stores settings and temporary state. The `contextMenus` permission provides the “Translate selected text” context-menu command. The content-script match scope supports selection translation across websites; Chrome-restricted pages cannot be injected.

### 4. Translation models and third-party services

Translation calls the Chrome Built-in Translator API available in the user's Chrome installation. Chrome may prompt the user to download a local language model the first time a language pair is used. Translator does not operate a server and does not call OpenAI, Gemini, DeepL, Azure, or any other third-party translation API. It does not include remote code.

### 5. User controls and deletion

Users can clear history, favorites, and translation cache from the extension settings, and can delete individual history or favorite items. Users can also remove the extension from Chrome's extension-management page. The extension has no developer-side data account or cloud copy.

### 6. Sharing and retention

The extension does not sell, rent, or share user text, translations, selected web content, history, favorites, or settings with the developer, advertising platforms, or other third parties. Data remains until the user clears it, removes the extension, or clears the relevant browser data. The developer does not retain the data on a server.

### 7. Contact

Project repository: <https://github.com/32736/translator-extension>

For privacy questions or issue reports, please contact the maintainer through GitHub Issues.

### 8. Chrome Web Store Limited Use statement

The extension uses information received from Chrome APIs or page context only to provide and improve its disclosed single purpose: user-requested, local text translation. This use adheres to the Chrome Web Store User Data Policy, including its Limited Use requirements.
