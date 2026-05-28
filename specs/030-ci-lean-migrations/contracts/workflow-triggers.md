# Contract: Workflow Triggers

This document is the authoritative contract between the repository's branch model and its CI/CD workflows. Any change to triggers, branches, or environment gating MUST be reflected here and in the spec.

## Branch model

| Branch | Role | Who pushes |
|---|---|---|
| `develop` | Integration target for feature work | Maintainers via PR merge from `feat/*`, `fix/*` |
| `staging` | Pre-prod surface; tracks what should be in Beta | Maintainers via PR merge from `develop` |
| `main` | Production release line | Maintainers via PR merge from `staging` (the existing `Merge development -> main` auto-merge in `deploy-production.yml` is retained for backwards compatibility but is orthogonal) |

## Workflow → trigger matrix

| Workflow | `pull_request` to `develop`/`staging`/`main` | `merge_group` | `push: develop` | `push: staging` | `push: main` | `workflow_dispatch` |
|---|---|---|---|---|---|---|
| `pull-request.yml` (PR validation) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `deploy-staging.yml` (NEW) | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ |
| `deploy-production.yml` (release) | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

PRs from forks: `pull-request.yml` runs with read-only permissions and no Environment secrets. `deploy-staging.yml` and `deploy-production.yml` are unreachable from a fork PR because they have no `pull_request` trigger and their jobs declare `environment:`, which fork-triggered runs cannot enter.

## Jobs per workflow

### `pull-request.yml`

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    # No `environment:` — no env secrets reachable from here
    concurrency:
      group: ci-${{ github.ref }}
      cancel-in-progress: true
    steps:
      - uses: ./.github/workflows/_shared-setup.yml  # checkout, set-shas, nx-cloud start, npm ci
      - run: npx nx affected -t lint typecheck test build -c ci
      - run: npx nx-cloud complete-ci-run
        if: always()
```

Top-level conclusion of `validate` is what branch protection requires.

### `deploy-staging.yml`

```yaml
on:
  push:
    branches: [staging]
  workflow_dispatch:

jobs:
  build:
    # Same setup as pull-request.yml but no `affected` base computation — staging always builds full
    uses: ./.github/workflows/_shared-setup.yml
    # … then test+build

  migrate-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    concurrency:
      group: migrate-staging
      cancel-in-progress: false
    steps:
  migrate-staging:
    needs: build
    uses: ./.github/workflows/_shared-migrate.yml
    with:
      target-environment: staging
    secrets: inherit

  deploy-staging:
    needs: migrate-staging
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - run: npx nx affected -t deploy --no-agents
        env:
          API_HOOK: ${{ secrets.STAGING_API_HOOK }}
          WORKER_SYNC_HOOK: ${{ secrets.STAGING_WORKER_SYNC_HOOK }}
          WORKER_RANKING_HOOK: ${{ secrets.STAGING_WORKER_RANKING_HOOK }}
```

### `deploy-production.yml`

```yaml
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      cloud-run: { type: boolean, default: true }
      # `e2e-tests` input removed — Playwright suite is unmaintained and removed from this workflow

jobs:
  build:
    # Existing deploy-production setup, minus the `Deploy to Beta` step (now in deploy-staging.yml)
    # Coverage merge runs here. E2E suite removed entirely (unmaintained).
    # SonarCloud removed entirely.

  migrate-prod:
    needs: build
    runs-on: ubuntu-latest
    environment: production            # ← required-reviewer gate fires here
    concurrency:
      group: migrate-production
      cancel-in-progress: false
    steps:
  migrate-prod:
    needs: build
    uses: ./.github/workflows/_shared-migrate.yml
    with:
      target-environment: production
    secrets: inherit

  deploy-prod:
    needs: migrate-prod
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: npx nx affected -t deploy --no-agents
        env:
          API_HOOK: ${{ secrets.PROD_API_HOOK }}
          WORKER_SYNC_HOOK: ${{ secrets.PROD_WORKER_SYNC_HOOK }}
          WORKER_RANKING_HOOK: ${{ secrets.PROD_WORKER_RANKING_HOOK }}

  sentry-release:
    needs: deploy-prod                  # was `needs: main` before
    # … (unchanged otherwise)
```

## Failure semantics

| Failing job | Downstream effect |
|---|---|
| `validate` (PR) | PR shows red. No deploy. |
| `build` (staging or prod) | `migrate-*` does not run. `deploy-*` does not run. |
| `migrate-staging` | `deploy-staging` does not run (FR-009, SC-007). |
| `migrate-prod` | `deploy-prod` does not run (FR-009, SC-007). Approval is consumed; re-attempt requires a new workflow run, which re-enters the approval gate. |
| `deploy-staging` / `deploy-prod` | Workflow ends red. Migration already committed (intentional — `up` already ran). Recovery is a code-level fix + re-run. |

## Acceptance criteria covered

- US1 → `pull-request.yml` validate job; no `git describe` on tags (FR-001).
- US2 → `deploy-staging.yml` migrate-staging + deploy-staging jobs (FR-006, FR-008).
- US3 → `deploy-production.yml` migrate-prod with `environment: production` gate (FR-007, FR-013, FR-014).
- US4 → `_shared-setup.yml` deduplicates, SonarCloud removed, E2E+coverage only in `deploy-production.yml` (FR-015, FR-016, FR-017).
