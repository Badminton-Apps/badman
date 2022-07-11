const { writeFileSync, readFileSync } = require('fs');
const { argv } = require('process');
const appVersionRegex =
  /^appVersion: \"([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+)?\"$/gim;

// Read chart file
let chart = readFileSync('./charts/Chart.yaml').toString();

// Replace appVersion
chart = chart.replace(appVersionRegex, `appVersion: "${argv[2]}"`);

// Write chart file
writeFileSync('./charts/Chart.yaml', chart);
