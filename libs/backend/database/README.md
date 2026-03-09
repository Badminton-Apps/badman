# backend-database

This library was generated with [Nx](https://nx.dev).

## Building

Run `nx build backend-database` to build the library.

## Running unit tests

Run `nx test backend-database` to execute the unit tests via [Jest](https://jestjs.io).

## Database migrations

Migrations are managed with [Sequelize CLI](https://github.com/sequelize/cli) and live in `database/migrations/`. They are **not** run automatically on application startup — they must be run manually before (or during) each deploy that requires a schema change.

Configuration is in `.sequelizerc` (points to `database/config/config.js` for connection details per environment).

### Running migrations

The `--env` flag must match a key in [`database/config/config.js`](../../../database/config/config.js). The available values are:

| `--env` value | Notes |
|---|---|
| `development` | default if omitted |
| `staging` | |
| `production` | |
| `prod` | alias for production |

All environments read from the same environment variables (`DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`), so what matters is which vars are in scope when you run the command, not the `--env` value itself.

```bash
# apply all pending migrations (development, env vars from .env)
npx sequelize-cli db:migrate

# apply all pending migrations (staging / production)
npx sequelize-cli db:migrate --env staging
npx sequelize-cli db:migrate --env production
```

### Rolling back

```bash
# undo the last applied migration
npx sequelize-cli db:migrate:undo --env staging

# undo all migrations (destructive — use with care)
npx sequelize-cli db:migrate:undo:all --env staging
```

### Adding a new migration

Create a new file in `database/migrations/` following the naming convention `YYYYMMDDHHMMSS-description.js`:

```js
"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        { tableName: "MyTable", schema: "myschema" },
        "myColumn",
        { type: Sequelize.DataTypes.STRING, allowNull: true },
        { transaction: t }
      );
    });
  },

  async down(queryInterface, _Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn(
        { tableName: "MyTable", schema: "myschema" },
        "myColumn",
        { transaction: t }
      );
    });
  },
};
```

Always wrap operations in a transaction so the migration is atomic. Always implement `down` so it can be rolled back cleanly.
