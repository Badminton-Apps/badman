#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

// print if we are going to add / rm the package
console.log(
  `${process.platform === 'win32' ? 'Adding' : 'Removing'} node-adodb package`
);

if (process.platform === 'win32') {
  execSync(
    'yarn add --mode update-lockfile -O node-adodb@https://github.com/nuintun/node-adodb',
    { stdio: 'inherit' }
  );
} else {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const isInstalled =
    packageJson.optionalDependencies['node-adodb'] !== undefined;

  // if installed, remove it
  if (isInstalled) {
    execSync('yarn remove --mode update-lockfile node-adodb', {
      stdio: 'inherit',
    });
  }
}
