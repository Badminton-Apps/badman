/* eslint-disable */
export default {
  // displayName: 'worker-belgium-flanders-points',
  preset: '../../../../../jest.preset.js',
  testEnvironment: 'node',
  passWithNoTests: true,
  testTimeout: 1000 * 60 * 10,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/worker/badminton/belgium/flanders/points',
};
