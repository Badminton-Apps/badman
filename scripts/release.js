const core = require('@actions/core');
const { releaseChangelog, releaseVersion } = require('nx/release');
const yargs = require('yargs');
const fs = require('fs');
const path = require('path');
const runExec = require('./run-exec');

// Walk through directory recursively
function walkDir(currentDir, newVersion) {
  fs.readdirSync(currentDir).forEach((file) => {
    const filePath = path.join(currentDir, file);

    if (fs.statSync(filePath).isDirectory()) {
      walkDir(filePath, newVersion);
    } else if (path.extname(filePath) === '.json' && file === 'version.json') {
      updateVersion(filePath, newVersion);
    }
  });
}

// Function to update version.json file
function updateVersion(filePath, newVersion) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');

    // Parse JSON content
    let data = JSON.parse(content);

    data = {
      ...data,
      version: newVersion,
    };

    // Stringify updated data
    const updatedContent = JSON.stringify(data, null, 2);

    // Write updated content to file
    fs.writeFileSync(filePath, updatedContent);
    console.log(`Updated ${filePath} to version ${newVersion}`);
  } catch (error) {
    console.error(`Error updating ${filePath}:`, error);
  }
}

(async () => {
  try {
    const options = await yargs
      .version(false) // don't use the default meaning of version in yargs
      .option('version', {
        description: 'Explicit version specifier to use, if overriding conventional commits',
        type: 'string',
      })
      .option('dryRun', {
        alias: 'd',
        description: 'Whether or not to perform a dry-run of the release process, defaults to true',
        type: 'boolean',
        default: true,
      })
      .option('verbose', {
        description: 'Whether or not to enable verbose logging, defaults to false',
        type: 'boolean',
        default: false,
      }).argv;

    const { workspaceVersion, projectsVersionData } = await releaseVersion({
      dryRun: options.dryRun,
      verbose: options.verbose,
    });

    // update version.json files
    walkDir('./apps', workspaceVersion);

    // // add version.json files to git
    await runExec("git add '**/**/version.json'");

    await releaseChangelog({
      versionData: projectsVersionData,
      version: workspaceVersion,
      dryRun: options.dryRun,
      verbose: options.verbose,
    });
    core.setOutput("NEW_VERSION", workspaceVersion);
    core.info(`New version: ${workspaceVersion}`);
  } catch (error) {
    core.setFailed(error.message);
  }
})();
