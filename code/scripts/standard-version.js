const standardVersion = require('standard-version');
const runExecFile = require('./run-execFile');
const runExec = require('./run-exec');
const core = require('@actions/core');
const conventionalChangelog = require('conventional-changelog');
const config = require('conventional-changelog-conventionalcommits');

(async () => {
  try {
    // get base and head from input args
    const [, , base, head] = process.argv;

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

    // await standardVersion({
    //   infile: 'apps/client/src/assets/CHANGELOG.md',
    //   silent: false,
    //   skip: {
    //     commit: true,
    //     tag: true,
    //   },
    // });

    // // run `nx update helm` to update the helm chart
    // await runExec(
    //   '',
    //   `npx nx affected --target=update-version  --newVersion=${newVersion} ${base} ${head}`
    // );

    // // Git add .
    // await runExecFile('', 'git', ['add', '.']);

    // // Git commit
    // await runExecFile('', 'git', [
    //   'commit',
    //   '-m',
    //   `chore(release): ${newVersion}`,
    // ]);

    // // Git tag with annotation
    // await runExecFile('', 'git', [
    //   'tag',
    //   `v${newVersion}`,
    //   `-m`,
    //   `chore(release): ${newVersion}`,
    // ]);

    // // Git push
    // await runExecFile('', 'git', [
    //   'push',
    //   '--follow-tags',
    //   'origin',
    //   currentBranch,
    // ]);

    // core.exportVariable('version', newVersion);
  } catch (err) {
    core.setFailed(err);
  }

  function extractChangelogEntry(args = {}) {
    return new Promise((resolve, reject) => {
      let content = '';
      const changelogStream = conventionalChangelog(
        config({
          skip: {
            tag: true,
            commit: true,
            bump: true,
          },
          types: [
            { type: 'feat', section: 'Features', hidden: false },
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
        }),
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
