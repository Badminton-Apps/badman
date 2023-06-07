// Credit: https://github.com/conventional-changelog/standard-version/blob/master/lib/run-exec.js

const { promisify } = require('util');
const core = require('@actions/core');

const exec = promisify(require('child_process').exec);

module.exports = async function (cmd, args) {
  core.debug(`Running: ${cmd}`, args);

  const promise = exec(cmd);
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