const tsParser = require('@typescript-eslint/parser');
const tsPlugin = require('@typescript-eslint/eslint-plugin');

module.exports = [
  {
    ignores: ['dist/**', 'node_modules/**', '.angular/**'],
  },
  {
    files: ['**/*.ts'],
    ignores: ['dist/**', 'node_modules/**', '.angular/**'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      // Always require braces for if/else/for/while
      curly: ['error', 'all'],
      // Do not enforce Prettier on TS
      'prettier/prettier': 'off',
      // Member ordering: constructor before methods (public→protected→private)
      '@typescript-eslint/member-ordering': 'off',
      // Merge multiple imports from the same module
      'no-duplicate-imports': ['error', { includeExports: false }],
      // Disallow unused variables and imports (allow underscore-prefixed)
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  // Angular component templates
  {
    files: ['src/app/**/*.html'],
    ignores: ['dist/**', 'node_modules/**', '.angular/**'],
    languageOptions: {
      parser: require('@angular-eslint/template-parser'),
    },
    plugins: {
      '@angular-eslint/template': require('@angular-eslint/eslint-plugin-template'),
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      // Attribute ordering handled by Prettier plugin to avoid conflicts
      '@angular-eslint/template/attributes-order': 'off',
      // Use Prettier with Angular parser; plugin reads groups from .prettierrc
      'prettier/prettier': ['error', { parser: 'angular' }],
    },
  },
  // Plain HTML files
  {
    files: ['src/index.html'],
    ignores: ['dist/**', 'node_modules/**', '.angular/**'],
    languageOptions: {
      parser: require('@angular-eslint/template-parser'),
    },
    plugins: {
      prettier: require('eslint-plugin-prettier'),
    },
    rules: {
      'prettier/prettier': ['error', { parser: 'html' }],
    },
  },
];
