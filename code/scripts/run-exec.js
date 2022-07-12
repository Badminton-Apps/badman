// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-exec.js

const { promisify } = require('util');
const core = require('@actions/core');

const exec = promisify(require('child_process').exec);

module.exports = async function (args, cmd) {
  core.debug(`Running: ${cmd}`, args);
  const { stderr, stdout } = await exec(cmd);
  // If exec returns content in stderr, but no error, print it as a warning
  if (stderr) {
    throw new Error(stderr);
  }
  if (stdout) {
    core.debug(stdout)
  }
  return stdout;
};
