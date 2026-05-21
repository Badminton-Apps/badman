# Tasks: Lean CI with Automated Migrations

**Feature**: 030-ci-lean-migrations
**Branch**: `030-ci-lean-migrations`
**Plan**: [plan.md](plan.md) | **Spec**: [spec.md](spec.md)
**Generated**: 2026-05-21

This is an infrastructure-as-code feature. All file paths are absolute from repo root and refer to `.github/workflows/`, `scripts/migrations/`, and GitHub repository settings (out-of-band, captured as documentation tasks).

Test tasks are NOT generated as separate items because spec.md does not request TDD and the "tests" for this feature are deliberate workflow runs against fixture branches — those live inside each user story phase as verification tasks tied to acceptance scenarios.

---

## Phase 1: Setup (one-time, admin)

These tasks are prerequisites for any migration-running workflow. They are done in the GitHub repository settings UI, not in code. Document the completion in `quickstart.md` (already done) and tick the boxes as each is verified.

- [X] T001 Create `staging` GitHub Environment in repo Settings → Environments; add seven Environment secrets — `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT` (=`postgres`), `DB_SSL` (=`true`) — pointing at the staging DB; no protection rules
- [ ] T002 [P] In the `staging` Environment, add Environment secrets `STAGING_API_HOOK`, `STAGING_WORKER_SYNC_HOOK`, `STAGING_WORKER_RANKING_HOOK`. Repo-level secret VALUES cannot be read back from GitHub — regenerate each deploy hook at Render.com (Service → Settings → Deploy Hook → Regenerate) and paste the new URLs. Old repo-level secrets become dead once Render rotates.
- [X] T003 Create `production` GitHub Environment in repo Settings → Environments; add seven Environment secrets — `DB_IP`, `DB_PORT`, `DB_DATABASE`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT` (=`postgres`), `DB_SSL` (=`true`) — pointing at the prod DB
- [X] T004 [P] In the `production` Environment, add Environment secrets `PROD_API_HOOK`, `PROD_WORKER_SYNC_HOOK`, `PROD_WORKER_RANKING_HOOK`. Same procedure as T002 — regenerate at Render.com, paste fresh URLs.
- [ ] T005 In the `production` Environment, configure protection rules: required reviewers (≥1 named maintainer), enable "Prevent self-review", wait timer 0
- [ ] T006 Create the `staging` branch from `develop` and push to origin; add `staging` to branch protection requiring PRs from `develop` and the `validate` job from `pull-request.yml` to pass
- [ ] T007 Verify outbound DB connectivity from GitHub-hosted runners by running a one-off `psql -c 'SELECT 1'` workflow against the staging DB via the seven `DB_*` env vars; if rejected, escalate (self-hosted runner is the fallback and is out of scope)

---

## Phase 2: Foundational (blocking prerequisites for US2 and US3)

Pre-flight tooling that the migration runner depends on. US1 does NOT depend on these — US1 ships first as the MVP.

- [X] T008 Create [scripts/migrations/check-invalid-indexes.js](scripts/migrations/check-invalid-indexes.js): Node script that reads the seven `DB_*` env vars (same shape as `database/config/config.js`), runs `SELECT n.nspname, c.relname FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT i.indisvalid;`, prints any `schema.index` hits with remediation instruction (`DROP INDEX CONCURRENTLY ...`), and exits non-zero on hit; uses `pg` driver from existing `package.json` (no new dep)
- [X] T009 [P] Create [.github/workflows/_shared-migrate.yml](.github/workflows/_shared-migrate.yml) per [contracts/migration-runner.md](contracts/migration-runner.md): `workflow_call` with input `target-environment` (string, required); the called `migrate` job declares `environment: ${{ inputs.target-environment }}` (which triggers the env protection rule for `production`) and `concurrency: { group: migrate-${{ inputs.target-environment }}, cancel-in-progress: false }`. Steps: checkout, `setup-node@v4` reading `.nvmrc`, `npm ci`, `node scripts/migrations/check-invalid-indexes.js`, `npx sequelize-cli db:migrate --debug 2>&1 | tee migrate.log` — all DB-touching steps export `DB_IP/PORT/DATABASE/USER/PASSWORD/DIALECT/SSL` from env-scoped secrets, then parse applied filenames into `$GITHUB_STEP_SUMMARY`; on failure dump last 50 lines of `migrate.log` to summary and exit non-zero
- [X] T010 [P] Confirm `.nvmrc` exists at repo root and pins to the Node version declared in `package.json` `engines`; if missing, create it with the matching version

**Checkpoint**: After T008–T010, the migration runner is callable. US2 and US3 can now consume `_shared-migrate.yml`. US4's deduplication phase will also build on this pattern.

---

## Phase 3: User Story 1 — PR validation passes reliably (P1) — MVP

**Story goal**: Every PR receives a non-cancelled code-attributable pass/fail status from `pull-request.yml`. Today's baseline is ~0% because of the tag-lookup error.

**Independent test**: Open a trivial PR (e.g. typo fix). The `validate` job runs to completion and reports green. Open a PR with a deliberately failing unit test or lint error; the job reports red with the failing item in logs.

This story is the MVP — it can ship and be observed in isolation before US2/US3/US4 land.

- [X] T010a [US1] `git mv .github/workflows/ci-v2.yml .github/workflows/pull-request.yml`; update the `name:` field at the top of the file from `CI v2` to `Pull Request Validation`. After merging, update any branch-protection rules in repo Settings → Branches that reference the old `CI v2` check name to point to the new check name (this is a one-time UI step).
- [X] T011 [US1] In [.github/workflows/pull-request.yml](.github/workflows/pull-request.yml), delete the `Ovverride Base to be last release` step (the `git describe --first-parent --match 'v*'` block) — this is the broken step that fails every PR
- [X] T012 [US1] In [.github/workflows/pull-request.yml](.github/workflows/pull-request.yml), delete the Playwright E2E step (`Run Playwright tests`), the `e2e reports` step, and the `playwright-report` artifact upload (unmaintained per follow-up clarification)
- [X] T013 [US1] In [.github/workflows/pull-request.yml](.github/workflows/pull-request.yml), delete the `coverage reports` step and the `coverage-report` artifact upload (FR-016)
- [X] T014 [US1] In [.github/workflows/pull-request.yml](.github/workflows/pull-request.yml), delete the `SonarCloud Scan` step entirely (FR-016, Q3)
- [X] T015 [US1] In [.github/workflows/pull-request.yml](.github/workflows/pull-request.yml), change the `nx affected -t test build -c ci` line to `nx affected -t lint typecheck test build -c ci` (adds explicit lint + typecheck per FR-002)
- [ ] T016 [US1] Open a draft PR with a no-op change (e.g. whitespace in README) targeting `develop`; verify the `validate` job completes green within 8 minutes
- [ ] T017 [US1] On the same PR, push a commit that introduces a deliberately failing unit test (or a lint violation); verify the job reports red with the offending test/rule name in logs (acceptance scenario 2/3 of US1)
- [ ] T018 [US1] On a separate throwaway long-lived branch with NO reachable `v*` tag in its history, open a PR; verify the job does NOT fail at any tag-lookup step (acceptance scenario 4 of US1)
- [ ] T019 [US1] In branch protection for `develop` (and `main`, `staging`), set the required status check to the `validate` job from `pull-request.yml`

**Checkpoint**: US1 complete. SC-001 (100% PRs get pass/fail) starts accumulating immediately. SC-002 (≤8 min median) measurable after ~10 PRs.

---

## Phase 4: User Story 2 — Staging migrations apply automatically (P2)

**Story goal**: Every push to `staging` runs pending migrations against the staging DB before the Beta deploy. Re-runs are idempotent.

**Independent test**: Push a no-op commit to `staging` → migration job green with "No pending migrations." Push a fresh migration → migration job green with the filename in step summary and a new row in staging's `SequelizeMeta`. Re-run via `workflow_dispatch` → no new row.

**Depends on**: Phase 1 (T001, T002, T006, T007) + Phase 2 (T008, T009, T010).

- [X] T020 [US2] Create [.github/workflows/deploy-staging.yml](.github/workflows/deploy-staging.yml) per [contracts/workflow-triggers.md](contracts/workflow-triggers.md) with `on: { push: { branches: [staging] }, workflow_dispatch: }`, three jobs: `build`, `migrate-staging` (depends on `build`, uses `_shared-migrate.yml`), `deploy-staging` (depends on `migrate-staging`)
- [X] T021 [US2] In `migrate-staging` job, declare `environment: staging`, `concurrency: { group: migrate-staging, cancel-in-progress: false }`, pass `secrets: inherit` (the env-scoped `DB_*` secrets become available because the called workflow's `migrate-staging` job declares `environment: staging`) and `inputs.target-environment: staging`
- [X] T022 [US2] In `deploy-staging` job, declare `environment: staging` and run `npx nx affected -t deploy --no-agents` with env `API_HOOK=${{ secrets.STAGING_API_HOOK }}`, `WORKER_SYNC_HOOK=${{ secrets.STAGING_WORKER_SYNC_HOOK }}`, `WORKER_RANKING_HOOK=${{ secrets.STAGING_WORKER_RANKING_HOOK }}`
- [ ] T023 [US2] Push a no-op commit to `staging`; verify `migrate-staging` step summary reads "No pending migrations." and `deploy-staging` completes green (fixture T1 of [contracts/migration-runner.md](contracts/migration-runner.md))
- [ ] T024 [US2] Author a trivial fixture migration on a throwaway feature branch (e.g. `CREATE TABLE _migrate_smoke_test`), merge to `develop` then to `staging`; verify the migration filename appears in the step summary and that the row exists in staging's `SequelizeMeta` within 30 minutes of merge (fixture T2; SC-004)
- [ ] T025 [US2] Re-run the same workflow via `workflow_dispatch`; verify it reports "No pending migrations." and does not double-apply (FR-008; fixture T3; US2 acceptance scenario 4)
- [ ] T026 [US2] Author a deliberately failing migration (`up: async () => { throw new Error('boom'); }`), merge to `staging`; verify `migrate-staging` red with the filename surfaced AND `deploy-staging` did NOT run (FR-009; SC-007; fixture T4; US2 acceptance scenario 3); roll back via `DROP TABLE` + revert PR
- [ ] T027 [US2] Manually leave an `INVALID` index on staging DB (`CREATE INDEX CONCURRENTLY ...; UPDATE pg_index SET indisvalid = false ...` or simulate by interrupting a real one), push any commit to `staging`; verify pre-flight from T008 reports the index name and migration step does not run (FR-011; SC-008; fixture T5)
- [ ] T028 [US2] Push two commits to `staging` back-to-back within a second; verify the second `migrate-staging` job queues at `concurrency: migrate-staging`, waits for the first, and runs serially with no cancellation (FR-012; fixture T6)

**Checkpoint**: US2 complete. SC-003 (0 manual `db:migrate` from laptop) tracked culturally from this point. SC-004 verified by T024.

---

## Phase 5: User Story 3 — Production migrations are explicit and gated (P2)

**Story goal**: Push to `main` enters an approval gate; on approval, prod migration runs, then prod deploy. PR commits never touch prod DB.

**Independent test**: Push a commit with a migration to `main` (via the normal `develop`→`main` flow). Verify the workflow halts at the approval gate. Approve. Verify migration runs, deploy runs, both green. Then push a PR with a migration to `develop`/`main` — verify prod DB is not contacted.

**Depends on**: Phase 1 (T003, T004, T005) + Phase 2 (T008, T009, T010) + US1 complete (PR validation working).

- [X] T028a [US3] `git mv .github/workflows/main-v2.yml .github/workflows/deploy-production.yml`; update the `name:` field at the top of the file from `Release Workflow v2` to `Deploy to Production`. The `run-name:` line still uses `${{ github.ref == 'refs/heads/main' && 'Prod' || 'Beta' }}` — change it to just `Prod release ${{ github.run_number }}` since Beta is no longer triggered from this workflow.
- [X] T029 [US3] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml), delete the Playwright E2E step, the `e2e-tests` workflow_dispatch input, the `e2e reports` step, and the `playwright-report` artifact upload (FR-016 follow-up — unmaintained)
- [X] T030 [US3] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml), delete the `SonarCloud Scan` step (FR-016, Q3)
- [X] T031 [US3] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml), delete the `Deploy to Beta` step (staging deploys now live in `deploy-staging.yml`; R10 of [research.md](research.md))
- [X] T032 [US3] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml), add a new job `migrate-prod` with `needs: main`, `environment: production`, `concurrency: { group: migrate-production, cancel-in-progress: false }`, calling `_shared-migrate.yml` with `inputs.target-environment: production` and `secrets: inherit`
- [X] T033 [US3] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml), extract the existing `Deploy to Prod` step into a new job `deploy-prod` with `needs: migrate-prod`, `environment: production`; pass `API_HOOK=${{ secrets.PROD_API_HOOK }}`, `WORKER_SYNC_HOOK=${{ secrets.PROD_WORKER_SYNC_HOOK }}`, `WORKER_RANKING_HOOK=${{ secrets.PROD_WORKER_RANKING_HOOK }}`
- [X] T034 [US3] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml), change `sentry-release.needs` from `main` to `deploy-prod` so a failed deploy does not still create a Sentry release
- [ ] T035 [US3] Push a no-op commit to `main` (via the existing `develop`→`main` flow); verify the workflow halts at the `migrate-prod` approval gate; approve; verify `migrate-prod` reports "No pending migrations." and `deploy-prod` runs green
- [ ] T036 [US3] Author a trivial fixture migration on a throwaway branch, merge through `develop`→`main`; verify the approval gate appears, then on approval the migration filename appears in step summary, a row is added to prod's `SequelizeMeta`, and `deploy-prod` runs green
- [ ] T037 [US3] Open a PR targeting `develop` that adds a migration; verify the PR's `pull-request.yml` run does NOT contact the prod DB (no environment access, no secret read) — confirm by absence of any prod-DB-related step in the run logs (acceptance scenario 1 of US3; SC-005; FR-004)
- [ ] T038 [US3] Author a deliberately failing prod migration on a throwaway branch (test by temporarily flipping the staging-env `DB_*` secrets → use a fixture against staging first, then mirror to prod ONLY if the team approves the destructive test); on failure verify `migrate-prod` red, `deploy-prod` NOT run, Sentry release NOT created (FR-009; SC-007; US3 acceptance scenario 4). If the team declines a real prod test, mark this verified by extrapolation from T026's staging behavior + identical YAML structure.

**Checkpoint**: US3 complete. SC-005 (0 prod migrations from PR commits) starts its 30-day window from here.

---

## Phase 6: User Story 4 — CI lean and free of duplication (P3)

**Story goal**: Setup logic exists once. Slow optional checks not on PR. Median PR ≤ 8 min.

**Independent test**: Inspect [.github/workflows/](.github/workflows/); confirm common setup is referenced from one place. Measure median PR time on the next 10 representative PRs.

**Depends on**: US1, US2, US3 already in place (refactor must not regress them).

- [X] T039 [US4] Create [.github/workflows/_shared-setup.yml](.github/workflows/_shared-setup.yml) as a `workflow_call` reusable workflow that exposes outputs and runs: `actions/checkout@v4` with `fetch-depth: 0`, `nrwl/nx-set-shas@v4`, `setup-node@v4` with `node-version-file: .nvmrc`, `npx --yes nx-cloud start-ci-run --distribute-on=".nx/workflows/dynamic-changesets.yaml"`, `npm ci`. Add input `cloud-distribute` (default `".nx/workflows/dynamic-changesets.yaml"`) to support `deploy-production.yml`'s alternate value `"3 linux-medium-js"`
- [X] T040 [US4] In [.github/workflows/pull-request.yml](.github/workflows/pull-request.yml), replace the inline checkout + `nx-set-shas` + `nx-cloud start-ci-run` + `npm ci` steps with `uses: ./.github/workflows/_shared-setup.yml`; keep the final `nx-cloud complete-ci-run` step in the calling workflow as it must run with `if: always()`
- [X] T041 [US4] In [.github/workflows/deploy-production.yml](.github/workflows/deploy-production.yml) `main` job, replace the equivalent inline steps with `uses: ./.github/workflows/_shared-setup.yml`, passing `cloud-distribute: "3 linux-medium-js"` to preserve the existing Nx Cloud agent shape; keep the `Setup package manager` step (existing PNPM/Yarn switch) intact for backward compatibility
- [X] T042 [US4] In [.github/workflows/deploy-staging.yml](.github/workflows/deploy-staging.yml) `build` job (from T020), confirm it already uses `_shared-setup.yml` (it was authored that way); if not, refactor to use it
- [ ] T043 [US4] Measure duplicated YAML LOC across `pull-request.yml` + `deploy-production.yml` before vs. after the refactor (use `git show HEAD~N:.github/workflows/pull-request.yml | wc -l` against the current branch); confirm reduction ≥ 40% (SC-006)
- [ ] T044 [US4] On a representative sample of 10 PRs, measure median wall-clock time of the `validate` job; confirm ≤ 8 minutes (SC-002 median); confirm 95th percentile ≤ 15 minutes
- [X] T045 [US4] Verify by inspection: no two workflow files contain identical setup blocks (checkout + base-SHA + Nx Cloud + install); each consumer references `_shared-setup.yml` (FR-015; US4 acceptance scenario 2)

**Checkpoint**: US4 complete. SC-002 and SC-006 verifiable.

---

## Phase 7: Polish & Decommissioning

Cross-cutting cleanup and verification. Some entries are post-rollout (T046 in particular is destructive and should wait for two successful prod deploys via the new flow).

- [ ] T046 After two consecutive successful `main`→prod deploys via the new flow, delete the repository-level secrets `PROD_API_HOOK`, `PROD_WORKER_SYNC_HOOK`, `PROD_WORKER_RANKING_HOOK`, `STAGING_API_HOOK`, `STAGING_WORKER_SYNC_HOOK`, `STAGING_WORKER_RANKING_HOOK` (Environment-scoped copies remain). Archive the old values in a password manager before deletion. NOT REVERSIBLE without the archived copies.
- [ ] T047 [P] After 14 days of US1 in production, query the GitHub Actions API for all `validate` job conclusions across `develop`/`main`/`staging` PRs; confirm 0 setup-stage failures (SC-001)
- [ ] T048 [P] After 30 days of US3 in production, audit the `production` environment deployment history; confirm every entry originated from `push: main` or `workflow_dispatch` and not from any PR-triggered run (SC-005)
- [ ] T049 [P] Update [docs/](docs/) — if a CI/CD operational doc exists, add a short pointer to [specs/030-ci-lean-migrations/quickstart.md](quickstart.md). If no such doc exists, leave quickstart.md as the canonical reference; do NOT create a new doc.
- [ ] T050 [P] Verify the `merge_group:` trigger on `pull-request.yml` still fires for merge-queue PRs (no regression) by checking the next merge queue run after deploy of US1 changes
- [ ] T051 Run `prettier --check .` over the modified `.github/workflows/*.yml` files; commit any formatting fixes. (Workflow YAML is in scope for the project's `prettier --check` gate per CLAUDE.md.)
- [ ] T052 Final spec ↔ implementation reconciliation: open [spec.md](spec.md) and confirm each FR-001..FR-018 has a tick (or a deliberate "verified out-of-band" note in tasks above); update any FRs that ended up scoped differently during implementation.

---

## Dependencies

```text
Phase 1 (Setup)     ─┬─► Phase 3 (US1, MVP)   ─┐
                     │                          │
                     ├─► Phase 2 (Foundational) ┤
                     │       │                  │
                     │       ├─► Phase 4 (US2) ─┤
                     │       │                  ├─► Phase 6 (US4) ─► Phase 7 (Polish)
                     │       └─► Phase 5 (US3) ─┤
                     │                          │
                     └──────────────────────────┘
```

- **Phase 1** (T001–T007) MUST complete before any migration job (Phase 4, Phase 5) runs because the Environments and secrets must exist.
- **Phase 2** (T008–T010) MUST complete before Phase 4 and Phase 5; not required for Phase 3.
- **Phase 3 (US1)** is the **MVP** and can ship the moment T011–T019 land. Recommended order: ship Phase 3 first, observe a week of green PRs, then proceed.
- **Phase 4 (US2)** and **Phase 5 (US3)** are independent of each other once Phase 2 is done — they can be developed in parallel by different operators.
- **Phase 6 (US4)** depends on US1/US2/US3 because it refactors the workflows they live in. Doing this earlier risks breaking the consumers before they exist.
- **Phase 7** is post-rollout cleanup.

## Parallel execution opportunities

Tasks marked `[P]` are parallelizable with their siblings in the same phase:

- **Phase 1**: T002 || T004 (different Environments)
- **Phase 2**: T009 || T010 (different files, no inter-dependency)
- **Phase 7**: T047 || T048 || T049 || T050 (independent verification + docs)

Within a single user story phase, tasks are sequential by design (each edits the same workflow file or builds on the previous step's wiring).

## Implementation strategy

1. **Land MVP (Phase 1 admin steps T001, T003, T005 + Phase 3 US1)** first. This stops the daily bleed of every-PR-red and gives the team immediate value. Two days of work.
2. **Land Phase 2 + Phase 4 (US2)** next. Staging migrations on a real branch with a real DB; verify with fixtures T1–T6. A week of work + verification.
3. **Land Phase 5 (US3)** after US2 has soaked for ~5 prod-equivalent runs without surprises. The approval gate is the human safety net; do not skip the soak.
4. **Land Phase 6 (US4)** as a pure refactor PR after US3 ships. Measurable via the LOC and time SCs.
5. **Run Phase 7** opportunistically over the following 30 days. T046 is the only irreversible step; wait for the cultural confidence before pulling that trigger.

## Format check

All tasks above follow `- [ ] TID [P?] [USx?] description with file path`. Setup (T001–T007), Foundational (T008–T010), and Polish (T046–T052) tasks intentionally have no `[USx]` label.

Total: 54 tasks (52 original + T010a rename `ci-v2.yml`→`pull-request.yml` + T028a rename `main-v2.yml`→`deploy-production.yml`). Per story: Setup 7, Foundational 3, US1 10, US2 9, US3 11, US4 7, Polish 7.
