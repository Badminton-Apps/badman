# Quickstart: Resolver Test Coverage

**Branch**: `032-resolver-test-coverage`

---

## Running the new tests

```bash
# Run all backend-graphql tests (includes new resolver specs)
nx test backend-graphql

# Run only the 15 new resolver specs
nx test backend-graphql --testPathPattern="availability|club-membership|cronJob|assembly|encounter-change|event\.resolver|draw\.resolver|subevent\.resolver|faq|notification|rankingSystemGroup|claim|role|service"

# Run a single resolver spec
npx jest --config libs/backend/graphql/jest.config.ts --testPathPattern="faq.resolver"
```

---

## Running the full coverage report

```bash
# Full coverage across all non-legacy libs and apps (no DB required)
npm run test:coverage:all
```

Output:
- **Console**: text summary table per lib
- **Files**: `coverage/libs/<name>/lcov.info` and `coverage/apps/<name>/lcov.info` per project

---

## Updating the coverage threshold

After running `npm run test:coverage:all`, note the `Lines %` from the `backend-graphql` summary line. Round down to the nearest 5% and update:

**File**: `libs/backend/graphql/jest.config.ts`

```typescript
coverageThreshold: {
  global: {
    lines: <new-value>,       // e.g. 65
    branches: <new-value>,
    functions: <new-value>,
    statements: <new-value>,
  },
},
```

Commit the change together with any test additions that caused the improvement.

---

## Adding a new resolver spec

1. Create `<resolver-name>.resolver.spec.ts` beside `<resolver-name>.resolver.ts`
2. Follow the pattern in `libs/backend/graphql/src/resolvers/setting/setting.resolver.spec.ts`
3. Consult `specs/032-resolver-test-coverage/data-model.md` for the correct provider stub shape
4. Run `nx test backend-graphql --testPathPattern="<resolver-name>"` to verify

---

## Reading the audit

`specs/032-resolver-test-coverage/audit.md` is a permanent artifact. When a finding is addressed in a separate PR:
1. Update its `Status` column to `fixed` (or `deferred — specs/NNN-...`)
2. Commit the change alongside the fix PR

---

## Key files changed by this feature

| File | Change |
|------|--------|
| `libs/backend/graphql/src/resolvers/*/` | 15 new `*.resolver.spec.ts` files |
| `libs/backend/graphql/jest.config.ts` | Added `coverageThreshold` + `coverageReporters` |
| `package.json` | Added `test:coverage:all` script |
| `AGENTS.md` | Added coverage command + threshold update instructions |
| `specs/032-resolver-test-coverage/audit.md` | Permanent audit artifact |
