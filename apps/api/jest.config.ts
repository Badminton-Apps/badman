 
export default {
  // displayName:api,
  preset: '../../jest.preset.js',
  testEnvironment: 'node',
  testTimeout: 1000 * 60 * 10,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/api',
};
