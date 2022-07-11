const {
  utils: { getProjects },
} = require('./code/node_modules/@commitlint/config-nx-scopes');

module.exports = {
  extends: ['./code/node_modules/@commitlint/config-conventional'],
  rules: {
    'scope-empty': [2, 'never'],
    'scope-enum': async (ctx) => [
      2,
      'always',
      [
        'docs',
        'ci',
        ...(
          await getProjects(
            ctx,
            ({ name, projectType }) => !name.includes('e2e')
          )
        )?.map((r) =>
          r
            ?.replace('code-apps-', '')
            ?.replace('code-libs', 'lib')
        ),
      ],
    ],
  },
};
