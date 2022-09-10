# TODO's

## Buildable libraries see https://github.com/nrwl/nx/issues/10773#issuecomment-1242688477

- [ ] Add the following code back to code\libs\frontend\ranking\project.json

```json
"build": {
    "executor": "@nrwl/angular:ng-packagr-lite",
    "outputs": ["dist/libs/frontend/ranking"],
    "options": {
      "project": "libs/frontend/ranking/ng-package.json"
    },
    "configurations": {
      "production": {
        "tsConfig": "libs/frontend/ranking/tsconfig.lib.prod.json"
      },
      "development": {
        "tsConfig": "libs/frontend/ranking/tsconfig.lib.json"
      }
    },
    "defaultConfiguration": "production"
  },

```

- [ ] Add the following code back to code\libs\frontend\components\game-history\project.json

```json
"build": {
      "executor": "@nrwl/angular:ng-packagr-lite",
      "outputs": ["dist/libs/frontend/components/game-history"],
      "options": {
        "project": "libs/frontend/components/game-history/ng-package.json"
      },
      "configurations": {
        "production": {
          "tsConfig": "libs/frontend/components/game-history/tsconfig.lib.prod.json"
        },
        "development": {
          "tsConfig": "libs/frontend/components/game-history/tsconfig.lib.json"
        }
      },
      "defaultConfiguration": "production"
    },
```

- [ ] Add the following code back to code\libs\frontend\components\player-info\project.json

```json
 "build": {
      "executor": "@nrwl/angular:ng-packagr-lite",
      "outputs": ["dist/libs/frontend/components/player-info"],
      "options": {
        "project": "libs/frontend/components/player-info/ng-package.json"
      },
      "configurations": {
        "production": {
          "tsConfig": "libs/frontend/components/player-info/tsconfig.lib.prod.json"
        },
        "development": {
          "tsConfig": "libs/frontend/components/player-info/tsconfig.lib.json"
        }
      },
      "defaultConfiguration": "production"
    },
```
