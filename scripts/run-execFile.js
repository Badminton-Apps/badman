// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-execFile.js

const { promisify } = require('util');
const core = require('@actions/core');

const execFile = promisify(require('child_process').execFile);

module.exports = async function (cmd, cmdArgs, args) {
  core.debug(`Running: ${cmd} ${cmdArgs.join(' ')}`, args);

  const promise = execFile(cmd, cmdArgs);
  const child = promise.child;

  child.stdout.on('data', function (data) {
    core.debug('stdout: ' + data);
  });
  child.stderr.on('data', function (data) {
    core.error('stderr: ' + data);
  });
  child.on('close', function (code) {
    core.debug('closing code: ' + code);
  });

  return promise;
};