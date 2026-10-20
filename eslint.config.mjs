import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import i18next from "eslint-plugin-i18next";
import importPlugin from "eslint-plugin-import";
import storybook from "eslint-plugin-storybook";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: {
      import: importPlugin,
      "unused-imports": unusedImports,
      i18next,
      storybook,
    },
    rules: {
      "unused-imports/no-unused-imports": "error",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/generated/**",
    "src/shared/generated/**",
  ]),
]);

export default eslintConfig;
