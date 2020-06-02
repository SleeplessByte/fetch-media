module.exports = {
  root: true,
  extends: ['universe', 'universe/shared/typescript-analysis'],
  env: {
    browser: true,
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
