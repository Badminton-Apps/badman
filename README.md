<h1 align="center">Badminton Belgium Simulation</h1>

<p align="center">
![GitHub](https://img.shields.io/github/license/Badminton-Apps/core)
![GitHub release (latest by date)](https://img.shields.io/github/v/release/Badminton-Apps/core)
![publish](https://github.com/Badminton-Apps/core/workflows/publish/badge.svg?branch=main)
[![codecov](https://codecov.io/gh/Badminton-Apps/core/branch/main/graph/badge.svg?token=R5LYY78RWC)](https://codecov.io/gh/Badminton-Apps/core)
</p>
<p align="center">
  <a href="https://badvlasim.westeurope.cloudapp.azure.com/"><strong>https://badvlasim.westeurope.cloudapp.azure.com/</strong></a>
  <br>
</p>

<p align="center">
  <a href="CONTRIBUTING.md">Contributing Guidelines</a>
  <br>
</p>

<hr>

## WIP!
Hi, right now most of project is still in prepartion to become publicly available. If you encounter any passwords, secrets, ... Please report it via a issue.

The markdown files are still a draft (and mostly copied from the angular github). However the [Commit guidelines][commit] still apply

## Development Setup

### Prerequisites

- [Node.js] which includes [Node Package Manager][npm]
- Running Postgress instance


### Frontend

Starting from root: `code/frontend`

- Install pacakges: `lerna bootstrap`
- Start client: `yarn start`

### Backend

Starting from root: `code/backend`

- Install pacakges: `lerna bootstrap`
- Rename all `.env.example` to `.env` and fill in with your values
- Populate data from: `rnd/initial_db.zip`

*eg: `psql "host=localhost port=5432 dbname=ranking user=ranking password=pass" < initial_db.sql`*
- Start server: `yarn start`

## Changelog

- [Frontend improvements][changelog_fe].
- [Backend improvements][changelog_be].

## Contributing

### Contributing Guidelines

Read through our [contributing guidelines][contributing] to learn about our submission process, coding rules and more.

### Code of Conduct

Help us keep Angular open and inclusive. Please read and follow our [Code of Conduct][codeofconduct].

[contributing]: CONTRIBUTING.md
[commit]: CONTRIBUTING.md#commit
[changelog_fe]: code/frontend/CHANGELOG.md
[changelog_be]: code/backend/CHANGELOG.md
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/get-npm
[codeofconduct]: CODE_OF_CONDUCT.md
