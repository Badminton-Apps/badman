 
export default {
  // displayName: 'worker-ranking',
  preset: '../../../jest.preset.js',
  testEnvironment: 'node',
  // passWithNoTests: true,
  // testTimeout: 1000 * 60 * 10,
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'html'],
  coverageDirectory: '../../coverage/apps/worker/ranking',
};
