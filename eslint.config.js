// @ts-check
const eslint = require('@eslint/js');
const fs = require('node:fs');
const path = require('node:path');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

// Derived from the filesystem so a new feature is protected automatically.
const FEATURES = fs
  .readdirSync(path.join(__dirname, 'src', 'app', 'features'), {
    withFileTypes: true,
  })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

module.exports = tseslint.config(
  {
    ignores: ['www/**', 'dist/**', '.angular/**', 'node_modules/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    extends: [
      ...angular.configs.tsRecommended,
    ],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/component-class-suffix': [
        'error',
        {
          suffixes: ['Page', 'Component'],
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Dependency boundaries (enforced via no-restricted-imports; no extra plugin).
  // domain -> libs + core/db + domain | core -> libs + domain (Dexie schema types
  // the tables with domain entities) + core | shared -> libs + core + domain +
  // shared | features/layouts -> libs + core(infra) + domain + shared, features
  // never import another feature. Only domain repositories (and core/db/tests)
  // touch the DB layer. src/app root (app.*.ts) is the composition layer.
  {
    files: ['src/app/domain/**/*.repository.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@(features|shared|layouts)/',
              message:
                'domain must not depend on UI layers (features/shared/layouts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/domain/**/*.ts'],
    ignores: ['**/*.repository.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@(features|shared|layouts)/',
              message:
                'domain must not depend on UI layers (features/shared/layouts).',
            },
            {
              regex: '^@core/db/app-db$',
              message:
                'only *.repository.ts may import the Dexie singleton; use repositories.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/core/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@(features|shared|layouts)/',
              message:
                'core must not depend on UI layers (features/shared/layouts).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@(features|layouts)/',
              message: 'shared must not depend on features/layouts.',
            },
            {
              regex: '^@core/db/app-db$',
              message:
                'shared must not touch the DB layer; use domain repositories.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/app/layouts/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: '^@features/',
              message:
                'layouts must not import features (routing owns lazy imports).',
            },
            {
              regex: '^@core/db/app-db$',
              message:
                'layouts must not touch the DB layer; use domain repositories.',
            },
          ],
        },
      ],
    },
  },
  ...FEATURES.map((feature) => ({
    files: [`src/app/features/${feature}/**/*.ts`],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@features/(?!${feature}(/|$))`,
              message: 'a feature must not import another feature.',
            },
            {
              regex: '^@core/db/app-db$',
              message:
                'features must not touch the DB layer; use domain repositories.',
            },
          ],
        },
      ],
    },
  })),
  // Pages are composition: they read/write through the feature
  // facade/store/query, never through repositories or the DB layer.
  // This block comes last so it wins over the feature block above for
  // pages (ESLint uses the last matching rule) while keeping its bans.
  ...FEATURES.map((feature) => ({
    files: [`src/app/features/${feature}/pages/**/*.ts`],
    ignores: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              regex: `^@features/(?!${feature}(/|$))`,
              message: 'a feature must not import another feature.',
            },
            {
              regex: '^@core/db/app-db$',
              message:
                'pages must use the feature facade/store/query, never the DB layer directly.',
            },
            {
              regex: '^@core/db/database$',
              message:
                'pages must use the feature facade/store/query, never the DB layer directly.',
            },
            {
              regex: '^@domain/.+\\.repository$',
              message:
                'pages must use the feature facade/store/query, never repositories directly.',
            },
          ],
        },
      ],
    },
  })),
  {
    files: ['**/*.spec.ts'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    files: ['**/*.html'],
    extends: [
      ...angular.configs.templateRecommended,
    ],
    rules: {},
  },
);
