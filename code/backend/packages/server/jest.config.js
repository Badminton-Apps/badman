module.exports = {
  transform: {
    "^.+\\.tsx?$": "ts-jest"
  },
  roots: ['<rootDir>/src'],
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: false,
  setupFiles:[
    "<rootDir>/../../test/env.js"
  ],
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        uniqueOutputName: false,
        suiteName: 'Test results',
        classNameTemplate: '{classname}-{title}',
        titleTemplate: '{classname}-{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
        includeConsoleOutput: true
      }
    ]
  ],
  testEnvironment: 'node',
  coverageReporters: ['cobertura', 'text-summary', 'lcov']
}; 
