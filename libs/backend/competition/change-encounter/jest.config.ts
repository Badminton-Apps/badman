 
export default {
  // displayName: 'backend-change-encounter',
  preset: '../../../../jest.preset.js',
  testEnvironment: 'node',
  testTimeout: 1000 * 60 * 10,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../../../coverage/libs/backend/competition/change-encounter',
};
