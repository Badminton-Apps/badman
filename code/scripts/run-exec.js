// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-exec.js

const { promisify } = require('util')

const exec = promisify(require('child_process').exec)

module.exports = async function (args, cmd) {
  if (args.dryRun) return
  try {
    console.log(`Running: ${cmd}`, args)
    const { stderr, stdout } = await exec(cmd)
    // If exec returns content in stderr, but no error, print it as a warning
    if (stderr) console.error(args, stderr)
    return stdout
  } catch (error) {
    // If exec returns an error, print it and exit with return code 1
    console.error(args, error.stderr || error.message)
    throw error
  }
}