/** @type {import('jest').Config} */
const outputPath = 'test-reports';

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['jest-test-performance'],
  coverageDirectory: outputPath,
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
        pageTitle: 'Test Report',
        outputPath: `${outputPath}/test-report.html`,
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