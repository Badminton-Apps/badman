import { releaseChangelog, releaseVersion, releasePublish } from 'nx/release';
import yargs from 'yargs';

(async () => {
  const { dryRun, verbose } = await yargs
    .options('dryRun', {
      type: 'boolean',
      default: true,
      alias: 'd',
    })
    .options('verbose', {
      type: 'boolean',
      default: false,
      alias: 'v',
    })
    .parseAsync();

  const { workspaceVersion, projectsVersionData } = await releaseVersion({
    dryRun,
    verbose,
    projects: ['badman'],
  });

  releaseChangelog({
    dryRun,
    verbose,
    version: workspaceVersion,
    versionData: projectsVersionData,
  });

  releasePublish({
    dryRun,
    verbose,
  });
})();
