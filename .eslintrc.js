module.exports = {
  root: true,
  extends: ['universe', 'universe/shared/typescript-analysis'],
  env: {
    browser: true,
  },
  rules: {
    "@typescript-eslint/no-redeclare": 0
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
