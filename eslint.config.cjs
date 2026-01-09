const tsParser = { languageOptions: { parser: require("@typescript-eslint/parser") } };

module.exports = [
  {
    ignores: [
      "artifacts/**",
      "types/**",
      "frontend/build/**",
      "frontend/dist/**",
      "frontend/node_modules/**",
      "node_modules/**",
    ],
  },
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
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
    ...tsParser,
    languageOptions: {
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
