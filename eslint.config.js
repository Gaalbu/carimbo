import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import { defineConfig } from 'eslint/config'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const NODE_TS_FILES = ['apps/api/**/*.ts', 'apps/worker/**/*.ts', 'packages/**/*.ts']
const WEB_FILES = ['apps/web/**/*.ts', 'apps/web/**/*.vue']

export default defineConfig(
  {
    ignores: ['**/dist/**', '**/.nuxt/**', '**/.output/**', '**/coverage/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['*.js'],
    languageOptions: { globals: globals.node },
  },
  {
    files: NODE_TS_FILES,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
  },
  {
    // Nuxt's generated tsconfigs only exist after `nuxt prepare`, so the web app gets the
    // non-type-aware rules; `nuxt typecheck` covers the types.
    files: WEB_FILES,
    extends: [tseslint.configs.strict, pluginVue.configs['flat/recommended']],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
    rules: {
      // Nuxt routes are named by file (`pages/index.vue`), not by component name.
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    // TypeScript already reports undefined names; Nuxt auto-imports would be false positives.
    files: ['**/*.ts', '**/*.vue'],
    rules: { 'no-undef': 'off' },
  },
  prettier,
)
