const nxPreset = require('@nx/jest/preset').default;

module.exports = { ...nxPreset, testTimeout: 1000 * 60 * 10 };
