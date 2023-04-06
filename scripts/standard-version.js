const standardVersion = require('standard-version');
const runExecFile = require('./run-execFile');
const runExec = require('./run-exec');
const core = require('@actions/core');
const conventionalChangelog = require('conventional-changelog');

(async () => {
  try {
    // get base and head from input args
    const base = process.argv?.find((arg) => arg.includes('--base='))
      ?.replace('--base=', '')
      .trim();
    const head = process.argv?.find((arg) => arg.includes('--head='))
      ?.replace('--head=', '')
      .trim();

    core.debug(`base: ${base}`);
    core.debug(`head: ${head}`);

    if (!base || !head) {
      core.setFailed('Missing base or head');
      return;
    }

    // get next version
    const versionExec = await runExec(
      '',
      "standard-version --dry-run | sed -e '1!d' -e 's/.*to //g'"
    );
    const newVersion = versionExec.stdout.trim();

    // get the current branch
    const branchExec = await runExecFile('', 'git', [
      'branch',
      '--show-current',
    ]);
    const currentBranch = branchExec.stdout.trim();

    // generate the full changelog
    const changelog = await extractChangelogEntry({ version: newVersion });
    core.info(`changelog: ${changelog}`);
    core.exportVariable('changelog', changelog);

    // Get affected projects from nx
    const affectedProjects = await runExec('', `npx --yes nx print-affected --base=${base} --head=${head}`);
    const affectedProjectsArray = JSON.parse(affectedProjects.stdout).projects;

    const bumpFiles = [
      { filename: 'package.json', type: 'json' }
    ];

    if (affectedProjectsArray.includes('badman')) {
      bumpFiles.push({
        filename: 'apps/badman/src/version.json',
        type: 'json',
      });
      bumpFiles.push({
        filename: 'apps/badman/src/assets/config.json',
        type: 'json',
      });
    }

    if (affectedProjectsArray.includes('api')) {
      bumpFiles.push({
        filename: 'apps/api/src/version.json',
        type: 'json',
      });
    }

    if (affectedProjectsArray.includes('worker-sync')) {
      bumpFiles.push({
        filename: 'apps/worker/sync/src/version.json',
        type: 'json',
      });
    }

    if (affectedProjectsArray.includes('worker-ranking')) {
      bumpFiles.push({
        filename: 'apps/worker/ranking/src/version.json',
        type: 'json',
      });
    }

      

    await standardVersion({
      infile: 'apps/badman/src/assets/CHANGELOG.md',
      packageFiles: ['package.json'],
      bumpFiles,
      silent: false,
      skip: {
        commit: true,
        tag: true,
      },
    });

    // Git add .
    await runExecFile('', 'git', ['add', '.']);

    // Git commit
    await runExecFile('', 'git', [
      'commit',
      '-m',
      `chore(release): v${newVersion}`,
    ]);

    // Git tag with annotation
    await runExecFile('', 'git', [
      'tag',
      `v${newVersion}`,
      `-m`,
      `chore(release): v${newVersion}`,
    ]);

    // Git push
    await runExecFile('', 'git', [
      'push',
      '--follow-tags',
      'origin',
      currentBranch,
    ]);

    core.exportVariable('version', `v${newVersion}`);
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