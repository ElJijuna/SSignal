const baseConfig = require('./jest.base.config.cjs');

const outputPath = 'test-reports';

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testMatch: ['**/__tests__/**/*.performance.test.ts'],
  setupFilesAfterEnv: ['jest-test-performance'],
  reporters: [
    'default',
    [
      '@jest-performance-reporter/core',
      {
        warnAfterMs: 500,
        jsonReportPath: `${outputPath}/performance-report.json`,
      },
    ],
    [
      'jest-html-reporter',
      {
        pageTitle: 'Performance Test Report',
        outputPath: `${outputPath}/performance-test-report.html`,
      },
    ],
    [
      'jest-slow-test-reporter',
      {
        numTests: 10,
        warnOnSlowerThan: 500,
      },
    ],
  ],
};
