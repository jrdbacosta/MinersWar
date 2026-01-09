const tsParser = require("@typescript-eslint/parser");

module.exports = [
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: { react: require("eslint-plugin-react") },
    rules: {
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
    },
    settings: {
      react: { version: "detect" },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
        project: ["./tsconfig.json"],
      },
    },
    plugins: { "@typescript-eslint": require("@typescript-eslint/eslint-plugin") },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
    },
  },
];
