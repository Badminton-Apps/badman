const standardVersion = require('standard-version');
const runExec = require('./run-exec');
const core = require('@actions/core');
const conventionalChangelog = require('conventional-changelog');

(async () => {
  try {
    // check if prod is set to true
    const prodFlag = process.argv?.find((arg) => arg.includes('--prod'));
    const affected = process.argv?.find((arg) => arg.includes('--affected='));

    // get affected projects from env
    const affectedProjects =
      affected
        ?.replace('--affected=', '')
        ?.replace('--affected', '')
        ?.split(',')
        ?.map((a) => a.replace(',').trim()) ?? [];

    core.info(`${affectedProjects.length} affected projects: ${affected}`);

    // if prod is set to false or not set at all, we are in beta mode
    const prod = prodFlag ? !prodFlag.includes('false') : false;

    // get next version
    const versionExec = await runExec(
      `standard-version ${
        !prod ? '--prerelease beta' : ''
      } --dry-run | sed -e '1!d' -e 's/.*to //g'`
    );
    const newVersion = versionExec.stdout.trim();
    core.info(`newVersion: ${newVersion}`);

    // generate the full changelog
    const changelog = await extractChangelogEntry({ version: newVersion });
    core.info(`changelog: ${changelog}`);

    const bumpFiles = [
      { filename: 'package.json', type: 'json' },
      { filename: '../package.json', type: 'json' },
    ];

    if (affectedProjects.includes('badman')) {
      bumpFiles.push({
        filename: '../apps/badman/src/version.json',
        type: 'json',
      });
      bumpFiles.push({
        filename: '../apps/badman/src/assets/config.json',
        type: 'json',
      });
    }

    if (affectedProjects.includes('api')) {
      bumpFiles.push({
        filename: '../apps/api/src/version.json',
        type: 'json',
      });
    }

    if (affectedProjects.includes('worker-sync')) {
      bumpFiles.push({
        filename: '../apps/worker/sync/src/version.json',
        type: 'json',
      });
    }

    if (affectedProjects.includes('worker-ranking')) {
      bumpFiles.push({
        filename: '../apps/worker/ranking/src/version.json',
        type: 'json',
      });
    }

    await standardVersion({
      infile: '../apps/badman/src/assets/CHANGELOG.md',
      packageFiles: ['package.json'],
      prerelease: prod ? undefined : 'beta',
      bumpFiles,
      silent: false,
      skip: {
        commit: true,
        tag: true,
      },
    });

    // export the new version and changelog as the environment variables
    core.exportVariable('NEW_VERSION', newVersion);
    core.exportVariable('CHANGELOG', changelog);
  } catch (err) {
    core.setFailed(err);
    console.error(err);
  }

  function extractChangelogEntry(args = {}) {
    return new Promise(async (resolve, reject) => {
      let content = '';
      const changelogStream = conventionalChangelog(
        {
          preset: {
            name: 'conventional-changelog-conventionalcommits',
            skip: {
              tag: true,
              commit: true,
              bump: true,
            },
            types: [
              { type: 'feat', section: 'Features' },
              { type: 'feature', section: 'Features' },
              { type: 'fix', section: 'Bug Fixes' },
              { type: 'perf', section: 'Performance Improvements' },
              { type: 'revert', section: 'Reverts' },
              { type: 'docs', section: 'Documentation' },
              { type: 'style', section: 'Styles' },
              { type: 'chore', section: 'Miscellaneous Chores' },
              { type: 'refactor', section: 'Code Refactoring' },
              { type: 'test', section: 'Tests' },
              { type: 'build', section: 'Build System' },
              { type: 'ci', section: 'Continuous Integration' },
            ],
          },
        },
        { version: args.version }
      );

      changelogStream.on('error', function (err) {
        return reject(err);
      });

      changelogStream.on('data', function (buffer) {
        content += buffer.toString();
      });

      changelogStream.on('end', function () {
        return resolve(content);
      });
    });
  }
})();
