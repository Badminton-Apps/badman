// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-execFile.js

const { promisify } = require('util')
const core = require('@actions/core');

const execFile = promisify(require('child_process').execFile)

module.exports = async function (args, cmd, cmdArgs) {
  core.debug(`Running: ${cmd} ${cmdArgs.join(' ')}`, args)
  const { stderr, stdout } = await execFile(cmd, cmdArgs)
  // If execFile returns content in stderr, but no error, print it as a warning
  if (stderr){
    throw new Error(stderr)
  }
  return stdout
}