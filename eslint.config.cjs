const js = require('@eslint/js');
const importPlugin = require('eslint-plugin-import');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          args: 'none',
          ignoreRestSiblings: true,
          caughtErrors: 'none',
        },
      ],
      'no-console': 'off',
      'import/order': ['warn', { 'newlines-between': 'always' }],
      'prefer-const': ['warn', { destructuring: 'all' }],
    },
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
  },
  {
    ignores: ['coverage/', 'dist/', 'node_modules/', '.matter-storage/'],
  },
];
