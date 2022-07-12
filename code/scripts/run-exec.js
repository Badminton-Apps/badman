// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-exec.js

const { promisify } = require('util');
const core = require('@actions/core');

const exec = promisify(require('child_process').exec);

module.exports = async function (args, cmd) {
  core.debug(`Running: ${cmd}`, args);
  try {
    const { stderr, stdout } = await exec(cmd);
    // If exec returns content in stderr, but no error, print it as a warning
    if (stderr) {
      core.warning(stderr);
    }
    if (stdout) {
      core.debug(stdout);
    }
    return stdout;
  } catch (error) {
    // If execFile returns an error, print it and exit with return code 1
    core.error(error.stderr || error.message);
    throw error;
  }
};
