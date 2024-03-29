module.exports = {
  env: {
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:jsx-a11y/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
  plugins: ["react", "@typescript-eslint", "jsx-a11y"],
  rules: {
    "no-empty": 0,
    "no-prototype-builtins": 0,
    "no-restricted-globals": ["error", "Image"],
    "@typescript-eslint/no-empty-function": 0,
    "@typescript-eslint/no-non-null-assertion": 0,
  },
  overrides: [
    {
      files: ["**/symbols/*.js"],
      rules: {
        "import/no-anonymous-default-export": 0,
      },
    },
  ],
};
