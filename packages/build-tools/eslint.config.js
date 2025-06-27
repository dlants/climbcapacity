import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import globals from 'globals';
import * as dcgviewRules from '../eslint-rules/dist/src/index.js';

export default [
  js.configs.recommended,
  {
    files: ['../scripts/**/*.ts', '../backend/**/*.ts', '../build-tools/**/*.ts'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    files: ['../scripts/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  {
    files: ['../client/**/*.ts', '../client/**/*.tsx'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    files: ['../client/**/*.tsx'],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
        project: '../client/tsconfig.json',
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      'dcgview': {
        rules: dcgviewRules.rules,
      },
    },
    rules: {
      'dcgview/dcgview-binding': 'error',
    },
  },

  {
    ignores: [
      '../node_modules/',
      '../**/dist/',
      '../**/build/',
      '../**/*.d.ts',
      '../client/dcgview/',
      '../backend/db/',
      '../scripts/dist/',
      '../**/playwright-report/',
      '../eslint-rules/dist/',
    ],
  },
];
