#!/usr/bin/env node
const { execSync } = require('child_process');

execSync('node ./decorate-angular-cli.js', { stdio: 'inherit' });
