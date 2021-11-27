module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  // roots: ['<rootDir>'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: [
    '**/packages/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/vendor/**'
  ],
  collectCoverage: true,
  setupFiles: ['<rootDir>/test/env.js'],
  reporters: ['default', 'jest-github-actions-reporter'],
  testEnvironment: 'node',
  coverageReporters: ['text-summary', 'lcov'],
  testLocationInResults: true,
  testTimeout: 100000000 // USE WHEN DEBUGGING :)
};
