const nxPreset = require('@nrwl/jest/preset').default;

module.exports = {
  ...nxPreset, 
  moduleNameMapper: {
    '^uuid$': require.resolve('uuid'),
  },
};
