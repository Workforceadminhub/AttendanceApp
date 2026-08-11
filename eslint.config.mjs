import reactHooks from "eslint-plugin-react-hooks";

export default [
  {
    ignores: ["build/**", "dist/**", "node_modules/**"],
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
  },
  {
    files: ["src/**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
  },
];
