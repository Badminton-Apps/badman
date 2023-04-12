# Badman

## dev

We greatly improved the development of the badman.

You now only need docker installed.

### 1. Environment values

- copy `.env.example` to `.env`
- And fill in the values

### 2. Install dependencies

run: `yarn install`

### 3. Start database/redis cache (if needed)

run: `yarn dev:up`

### 4. Start client and server

- run: `yarn start` for the client
- run: `yarn start api` for the api

#### 4.a First time running:

- run the migration and seeding `npx --yes sequelize-cli db:migrate && npx --yes sequelize-cli db:seed:all`
- open: http://localhost:3000/player/admin
- login with your badman credentials
- Claim the admin account

### 4. Profit

Badman should be availible @ http://localhost:3000

### Debugging

Add the following to your `launch.json`

```json
{
  "name": "Server",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}/code",
  "remoteRoot": "/usr/src",
  "restart": true
}
```

for debugging the workers use following ports:

- worker-sync: 9230.
- worker-ranking: 9231

### Generate pwa assets

https://github.com/elegantapp/pwa-asset-generator

### splash

`npx pwa-asset-generator "./apps/badman/src/assets/logo.svg" "./apps/badman/src/assets/icons" -i "./apps/badman/src/index.html" -m "./apps/badman/src/manifest.webmanifest" --dark-mode  --opaque false --background "#303030"`

`npx pwa-asset-generator "./apps/badman/src/assets/logo.svg" "./apps/badman/src/assets/icons" -i "./apps/badman/src/index.html" -m "./apps/badman/src/manifest.webmanifest" --icon-only --favicon --dark-mode  --opaque false --background "rgba(0, 0, 0, 0)"`

`npx pwa-asset-generator "./apps/badman/src/assets/logo.svg" "./apps/badman/src/assets/icons" -i "./apps/badman/src/index.html" -m "./apps/badman/src/manifest.webmanifest" --icon-only --dark-mode  --opaque false --background "rgba(0, 0, 0, 1)"`


### speedtest
https://github.com/rakyll/hey
`hey -n 256 -c 8 -z 30s http://localhost:5001/api/v1/ > results.txt`

### Upgrade to latest packages
1. `NX_MIGRATE_USE_LOCAL=true nx migrate latest`
2. `yarn`
3. `NX_MIGRATE_USE_LOCAL=true yarn exec nx migrate --run-migrations`