module.exports = {
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  roots: ['<rootDir>/src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverageFrom: ['**/*.{ts,tsx}', '!**/node_modules/**', '!**/vendor/**'],
  collectCoverage: true,
  setupFiles: ['<rootDir>/../../test/env.js'],
  reporters: ['default', 'jest-github-actions-reporter'],
  testEnvironment: 'node',
  coverageReporters: ['text-summary', 'lcov'],
  testLocationInResults: true
};
