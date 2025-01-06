module.exports = {
  root: true,
  extends: ['universe', 'universe/shared/typescript-analysis'],
  parserOptions: {
    project: './tsconfig.json',
  },
  env: {
    browser: true,
  },
  rules: {
    '@typescript-eslint/no-redeclare': 0,
    'prettier/prettier': 0
  },
  overrides: [
    {
      files: ['index.ts'],
      parserOptions: {
        project: './tsconfig.json',
      },
    },
  ],
};
