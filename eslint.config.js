import eslintJest from 'super-configs/eslint/jest';
import eslintTs from 'super-configs/eslint/ts';

export default [
  {
    ignores: ['lib/**', 'dist/**', 'coverage/**', 'node_modules/**', 'test-reports/**', '*.cjs'],
  },
  ...eslintTs,
  ...eslintJest,
];
