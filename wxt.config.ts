import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-vue'],

  manifest: {
    name: 'Translator',
    description: 'Local-first lightweight translator',
    minimum_chrome_version: '138',

    permissions: ['storage', 'contextMenus'],

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
