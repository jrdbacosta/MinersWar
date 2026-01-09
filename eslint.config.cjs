const tsParser = { parser: "@typescript-eslint/parser" };

module.exports = [
  {
    ignores: [
      "**/artifacts/**",
      "**/types/**",
      "**/frontend/build/**",
      "**/frontend/node_modules/**",
      "**/node_modules/**",
      "**/cache/**",
      "**/dist/**",
      "**/*.lock",
    ],
  },
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
    },
    plugins: { react: require.resolve("eslint-plugin-react") },
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
      ecmaVersion: 2022,
      sourceType: "module",
      ecmaFeatures: { jsx: true },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        project: ["./tsconfig.json"],
      },
    },
    plugins: { "@typescript-eslint": require.resolve("@typescript-eslint/eslint-plugin") },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "off",
    },
  },
];
