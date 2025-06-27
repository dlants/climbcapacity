import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";
import globals from "globals";
import * as dcgviewRules from "./packages/eslint-rules/dist/src/index.js";

export default [
  js.configs.recommended,
  {
    files: [
      "packages/scripts/**/*.ts",
      "packages/backend/**/*.ts",
      "packages/build-tools/**/*.ts",
    ],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    files: ["packages/scripts/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
    },
  },
  {
    files: ["packages/frontend/**/*.ts", "packages/frontend/**/*.tsx"],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
    },
  },
  {
    files: ["packages/frontend/**/*.tsx"],
    languageOptions: {
      parser: parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        project: "packages/frontend/tsconfig.json",
      },
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      dcgview: {
        rules: dcgviewRules.rules,
      },
    },
    rules: {
      "dcgview/dcgview-binding": "error",
    },
  },

  {
    ignores: [
      "node_modules/",
      "**/dist/",
      "**/build/",
      "**/*.d.ts",
      "packages/frontend/dcgview/",
      "packages/backend/db/",
      "packages/scripts/dist/",
      "**/playwright-report/",
      "packages/eslint-rules/dist/",
    ],
  },
];
