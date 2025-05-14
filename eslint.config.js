import pluginTs from '@typescript-eslint/eslint-plugin'
import parserTs from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import { defineConfig } from 'eslint/config'

export default defineConfig([
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: parserTs,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': pluginTs,
      prettier: prettierPlugin,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error'],
      '@typescript-eslint/consistent-type-imports': ['error'],
      'generator-star-spacing': 'off',
      quotes: ['error', 'single'],
      indent: 'off', // handled by prettier
      'no-throw-literal': 'off',
      'comma-dangle': ['error', 'always-multiline'],

      // prettier formatting
      'prettier/prettier': 'error',
    },
  },
])
