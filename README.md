# Badman

### 1. Environment values

- copy `.env.example` to `.env`
- And fill in the values (Request complete set of ENV variables from PandaPanda Team)

### 2. Install dependencies

run: `npm install` (currently using node 20.19.0)

### 3. Creating database

- Install posgres locally if not already installed
- create database called "badman-db" (using psql command line tool)
- give all privileges to user called "panda" (and create said user if not already created)
- Once database created, do the following to ensure `postgis` will work in app:
  - Use your global package manager (usually brew on mac) to install `postgis`
    - mac command: `brew install postgis`
  - run `\c "badman-db";` to create connection to database
  - run `CREATE EXTENSION postgis;`

### 4. Restoring database

It is best to restore your local database with a copy of the production database, so you will have lots of test data to work with.

- use psql cmmand line, PGAdmin or another database explorer tool to restore from a backup
- note: if the `postgis` configuration is not completed, the locations table will not successfully restore from backup!

### 5. Start redis server

- ensure you have redis installed on local machine
- in terminal, run ` redis-server --port 6379` to open redis server

### 6. Start client and server

- run: `npm start` for the legacy client (running on port 3000)
- run: `npm start api` for the api (running on port 5010)

### 7. Run database migrations (if first time runninf)

- run migrations `npx --yes sequelize-cli db:migrate`

### 8. Authentication and user management

The badman app uses `Auth0` for user management and authentication. In order to log into the app, you will need to create an account on the auth0 system, and then "claim"
that account within the badman application.

Because we are using a copy of production data locally, and becuase you will ideally want to be logged in with users that are linked to clubs and teams, you will first create an account in auth0 (using your own email and password), and then "link" that account to the user you wish to log in as within your database. It helps tremendously to use a database explorer tool like PGAdmin to accomplish this!

Steps:

- navigate to the login page of application (either of legacy client app, or in the `badman-frontend` application)
- click `sign up` at bottom of login card, and follow steps to login
- open a new tab, and navigate to auth0.com. Click `Login`
- Login to Auth0 (ask PandaPanda for login credentials)
- Navigate to `User Management > users`
- Search for the user account you just created, and copy the `userId`
- In PGAdmin:
  - Find the public."Players" table, and search for the player you would like to login as.
  - When you find a player, add the `userId` from `Auth0` into the `sub` column for that record. Save the changes.
  - Your Auth0 credentials are now linked to this user account locally! You will be able to see their data,

### 9. Async workers

There are currently 2 async workers that can be run on the application, which sync various data to and from `Toernooi.nl`, the platform that serves as the source of truth for all competition and tournament scheduling, clubs and teams, encounter results, and player rankings. The workers are:

- `Ranking`: syncs all player ranking data, as encounters are updated
  - to start, run `npm run start worker-ranking`
- `Sync`: Syncs all encounter, competition and tournament data to and from `Toernooi.nl
  - to start, run `npm run start worker-sync`

Note: These workers heavily rely on the toernooi.nl system, and utilize the `VR_API_USER` and `VR_API_PASS` env variables. These variables should be available by request to the PandaPanda team. Be careful though: if the sync worker has actual credentials, there is the potential that "production" data on the toernooi.nl website will be affected. Refer to PandaPanda's documentation on the badman workers to understand what things can be affected, and the standard sync schedule for each worker before running them with true credentials. Otherwise, add `Test` as the value of each variable to ensure data does not get updated.

## Legacy readme content

everything below this should be further reviewed, and edited or removed

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

- worker-sync: 9230
- worker-ranking: 9231

### Generate pwa assets

https://github.com/elegantapp/pwa-asset-generator

### splash

`npx pwa-asset-generator "./apps/badman/src/assets/logo.svg" "./apps/badman/src/assets/icons" -i "./apps/badman/src/index.html" -m "./apps/badman/src/manifest.json" --dark-mode  --opaque false --background "#303030"`

`npx pwa-asset-generator "./apps/badman/src/assets/logo.svg" "./apps/badman/src/assets/icons" -i "./apps/badman/src/index.html" -m "./apps/badman/src/manifest.json" --icon-only --favicon --dark-mode  --opaque false --background "rgba(0, 0, 0, 0)"`

`npx pwa-asset-generator "./apps/badman/src/assets/logo.svg" "./apps/badman/src/assets/icons" -i "./apps/badman/src/index.html" -m "./apps/badman/src/manifest.json" --icon-only --dark-mode  --opaque false --background "rgba(0, 0, 0, 1)"`

### speedtest

https://github.com/rakyll/hey
`hey -n 256 -c 8 -z 30s http://localhost:5001/api/v1/ > results.txt`
