const baseConfig = require('./jest.base.config.cjs');

/** @type {import('jest').Config} */
module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: ['\\.performance\\.test\\.ts$'],
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 100,
      lines: 95,
      statements: 95,
    },
  },
};
