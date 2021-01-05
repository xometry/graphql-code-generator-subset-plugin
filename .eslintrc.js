module.exports = {
  parser: "@typescript-eslint/parser",
  extends: [
    "airbnb-base", // Uses the airbnb eslinting rules. This also works with typescript
    "prettier", // Uses the prettier plugin base.
    "plugin:jest/recommended", // Uses the jest recommended eslint settings.
    "plugin:@typescript-eslint/recommended", // Uses the recommended rules from @typescript-eslint/eslint-plugin
    "prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
    "plugin:prettier/recommended", // Enables eslint-plugin-prettier and eslint-config-prettier. This will display prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
  ],
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  env: {
    node: true,
  },
  settings: {
    "import/resolver": {
      node: {
        extensions: [".js", ".ts"],
      },
    },
  },
  rules: {
    "prettier/prettier": "error",
    "import/prefer-default-export": "off",
    "max-classes-per-file": "off",
    "no-underscore-dangle": "off",
    "no-await-in-loop": "off",
    "no-restricted-syntax": [
      // We override this from airbnb-base to allow for...of statements, but keep the other rules. See https://github.com/airbnb/javascript/issues/1271#issuecomment-548688952
      "error",
      {
        selector: 'ForInStatement', 
        message: 'for..in loops iterate over the entire prototype chain, which is virtually never what you want. Use Object.{keys,values,entries}, and iterate over the resulting array.', 
      },
      {
        selector: 'LabeledStatement', 
        message: 'Labels are a form of GOTO; using them makes code confusing and hard to maintain and understand.', 
      },
      {
        selector: 'WithStatement', 
        message: '`with` is disallowed in strict mode because it makes code impossible to predict and optimize.', 
      },
    ],
    "no-use-before-define": "off",
    "@typescript-eslint/no-unused-vars": ["error", {"argsIgnorePattern": "^_"}],
    "@typescript-eslint/no-use-before-define": ["error"],
    "import/extensions": ["error", "always", {"ts": "never", "js": "never", "tsx": "never"}]
  },
  overrides: [],
};
