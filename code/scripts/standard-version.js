const standardVersion = require('standard-version');
const runExecFile = require('./run-execFile');
const runExec = require('./run-exec');
const core = require('@actions/core');
const presetLoader = require('standard-version/lib/preset-loader');
const conventionalChangelog = require('conventional-changelog');

(async () => {
  try {
    // get base and head from input args
    const [, , base, head] = process.argv;

    // generate the full changelog
    const changelog = await extractChangelogEntry();
    await standardVersion({
      infile: 'apps/client/src/assets/CHANGELOG.md',
      silent: false,
      skip: {
        commit: true,
        tag: true,
      },
    });

    // get the version number from the package.json
    const pkg = require('../package.json');
    const version = pkg.version;
    const { stdout, stderr } = await runExecFile('', 'git', [
      'branch',
      '--show-current',
    ]);

    // get the current branch
    const currentBranch = stdout.trim();

    // run `nx update helm` to update the helm chart
    await runExec(
      '',
      `npx nx affected --target=update-version  --newVersion=${version} ${base} ${head}`
    );

    // Git add .
    await runExecFile('', 'git', ['add', '.']);

    // Git commit
    await runExecFile('', 'git', [
      'commit',
      '-m',
      `chore(release): ${version}`,
    ]);

    // Git tag with annotation
    await runExecFile('', 'git', [
      'tag',
      `v${version}`,
      `-m`,
      `chore(release): ${version}`,
    ]);

    // Git push
    await runExecFile('', 'git', [
      'push',
      '--follow-tags',
      'origin',
      currentBranch,
    ]);

    core.exportVariable('changelog', changelog);
    core.exportVariable('version', version);
    core.info(`changelog: ${changelog}`);

  } catch (err) {
    core.setFailed(err);
  }

  function extractChangelogEntry(args = {}) {
    return new Promise((resolve, reject) => {
      let content = '';
      const changelogStream = conventionalChangelog({
        debug:
          args.verbose && core.info.bind(console, 'conventional-changelog'),
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
      }).on('error', function (err) {
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
