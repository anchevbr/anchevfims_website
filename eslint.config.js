import js from '@eslint/js';
import globals from 'globals';

export default [
  { ignores: ['node_modules/**', 'playwright-report/**', 'test-results/**', 'artifacts/**'] },
  {
    files: ['server.js', 'src/**/*.js', 'tests/**/*.js', 'scripts/*.mjs', 'playwright.config.js'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: { ...globals.node, ...globals.browser } },
    rules: { ...js.configs.recommended.rules, 'no-empty': ['error', { allowEmptyCatch: true }], 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }] }
  },
  {
    files: ['public/scripts/console.js', 'public/scripts/app.js', 'public/scripts/modules/{localization,language,cinema,service-pages,contact,content-markup,experience,projects,about,ui}.js'],
    ...js.configs.recommended,
    languageOptions: { ecmaVersion: 'latest', sourceType: 'module', globals: globals.browser },
    rules: { ...js.configs.recommended.rules, 'no-empty': ['error', { allowEmptyCatch: true }], 'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }] }
  },
  { files: ['src/security.js'], rules: { 'no-control-regex': 'off' } }
];