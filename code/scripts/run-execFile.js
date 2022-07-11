// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-execFile.js

const { promisify } = require('util')

const execFile = promisify(require('child_process').execFile)

module.exports = async function (args, cmd, cmdArgs) {
  if (args.dryRun) return
  try {
    console.log(`Running: ${cmd} ${cmdArgs.join(' ')}`, args)
    const { stderr, stdout } = await execFile(cmd, cmdArgs)
    // If execFile returns content in stderr, but no error, print it as a warning
    if (stderr) console.error(args, stderr)
    return stdout
  } catch (error) {
    // If execFile returns an error, print it and exit with return code 1
    console.error(args, error.stderr || error.message)
    throw error
  }
}