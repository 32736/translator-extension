import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],

  manifest: {
    name: 'Translator',
    description: 'Local-first lightweight translator',
    minimum_chrome_version: '138',

    permissions: ['storage', 'contextMenus'],

    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },

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
