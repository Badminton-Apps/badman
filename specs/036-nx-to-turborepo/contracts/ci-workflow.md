# Contract: CI / Deploy Workflows

How the GitHub Actions workflows change. Verifies FR-007, FR-008, FR-010, FR-013, SC-004, SC-005, SC-013.

## `setup-monorepo` composite action (rewrite)

| Today (npm + Nx)                                 | Target (pnpm + Turborepo)                                                                     |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `nrwl/nx-set-shas@v4`                            | removed — `turbo --affected` derives SHAs from git (or set `TURBO_SCM_BASE`/`TURBO_SCM_HEAD`) |
| `setup-node` `cache: npm` + cache `node_modules` | `pnpm/action-setup` + `setup-node` `cache: pnpm`; `pnpm install --frozen-lockfile`            |
| cache `.nx/cache` keyed on ref+sha               | cache `.turbo` keyed on lockfile+ref (local cache only — FR-018)                              |
| `npm ci`                                         | `pnpm install --frozen-lockfile`                                                              |

## `pull-request.yml` (rewrite)

```yaml
# remove: legacy-projects.js step, scope:legacy exclusion (FE deleted)
- uses: ./.github/actions/setup-monorepo
- run: pnpm turbo run lint test --affected # build still excluded from PR gate (kept)
```

## `deploy-staging.yml` (rewrite)

```yaml
- uses: ./.github/actions/setup-monorepo
- run: pnpm turbo run lint test build --affected
# then call _shared-migrate.yml (UNCHANGED — holds concurrency lock) → deploy
```

## `deploy-production.yml` (rewrite)

```yaml
- name: Resolve last release tag # KEEP existing shell
  run: |
    LAST=$(git rev-list -n 1 "$(git describe --match 'v*' --abbrev=0 --tags)")
    echo "TURBO_SCM_BASE=$LAST" >> "$GITHUB_ENV"
    echo "TURBO_SCM_HEAD=origin/${{ github.ref_name }}" >> "$GITHUB_ENV"
- run: pnpm turbo run lint test build --affected # FR-013 base resolution preserved
# release: googleapis/release-please-action (single-version) replaces `nx release`  (D9)
# migrate: _shared-migrate.yml (UNCHANGED — prod approval gate + concurrency)        (FR-010)
- run: pnpm turbo run deploy # replaces `nx run-many -t deploy --all`; each app posts Render hook
```

## External (out-of-band) — Render.com build command

Not in the repo. Must change in the Render dashboard at cutover for each service (api + 4 workers):

```
corepack enable && pnpm install --frozen-lockfile && pnpm turbo run build --filter=<service>
# start: node dist/apps/<service>/main.js   (outDir unchanged from today)
```

## Acceptance

| Check            | Expected                                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------------------- |
| PR scoping       | PR touching 1 lib → only that lib + dependents lint/test (FR-007, SC-004)                                             |
| PR cache hit     | identical re-run → cached tasks, faster (FR-008, SC-005)                                                              |
| Prod base        | prod build affected since last `v*` tag, not whole repo (FR-013)                                                      |
| Migration safety | `_shared-migrate.yml` untouched: concurrency lock + prod approval intact (FR-010)                                     |
| Release          | merge release PR → single repo-wide version bump + changelog + tag + GitHub release, no manual files (FR-012, SC-007) |
| Atomic           | post-merge `develop` green; no Nx artifacts remain (SC-009, SC-013)                                                   |
