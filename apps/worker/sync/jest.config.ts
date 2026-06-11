export default {
  // displayName: 'worker-sync',
  preset: "../../../jest.preset.js",
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "js", "html"],
  coverageDirectory: "../../../coverage/apps/worker/sync",
  // Bull keeps Redis connections open after tests; forceExit prevents hanging
  // forceExit: true,
  testTimeout: 30000,
};
