# Technical debt registry

<!--
Versions (newest first):
- v1.0 — 2026-04-27 — Initial registry: three seed entries (Visual API
  date duality, XmlScores/XmlStats z.unknown(), legacy Angular frontend).
-->

## How to use

- **Add** an entry the same commit you ship a *knowing* compromise. Don't add things you'd routinely fix in a small refactor.
- **Remove** an entry in the same commit that resolves the debt. Stale entries are worse than missing ones.
- **Required fields** per entry: where, what, why we shipped it, fix effort + trigger to revisit. Skip the rest.
- **Add a row** to the table below for every entry, in the same order. Sort within each Area by impact (worst first).
- **Bump the version** at the top when you add, remove, or materially edit an entry.

## Debt table

| Title | Area | Where | Effort | Trigger to revisit | Status |
|---|---|---|---|---|---|
| [Visual API: schema/interface duality on Date fields](#visual-api-schemainterface-duality-on-date-fields) | Backend | `libs/backend/visual/src/utils/visual-result.ts` | ~1 day | New Visual date field, or sync regression from a date-format change | open |
| [Visual API: XmlScores / XmlStats kept as z.unknown()](#visual-api-xmlscores--xmlstats-kept-as-zunknown) | Backend | `libs/backend/visual/src/utils/visual-result.ts` | ~half day | First feature that actually reads `.Scores.Score` / `.Stats.Stat` | open |
| [Legacy Angular frontend](#legacy-angular-frontend) | Frontend | `apps/badman/`, `libs/frontend/` | 1–2 days | New frontend repo solo in prod for one release cycle | open |

---

## Backend

### Visual API: schema/interface duality on Date fields

- **Where**: [libs/backend/visual/src/utils/visual-result.ts](../libs/backend/visual/src/utils/visual-result.ts) — `XmlTournament`, `XmlMatch`, `XmlTeamMatch`, `XmlItem` interfaces vs their `*Schema` zod schemas.
- **What**: ~16 date fields (`StartDate`, `EndDate`, `MatchTime`, `LastUpdated`, the various `*PublicationDate` fields) are typed as `Date` in the consumer-facing interfaces but as `string` in the runtime schemas.
- **Why we shipped it**: collapsing to one source of truth means either (a) transforming strings → Date in the schema, or (b) updating ~20 consumer call sites in worker-sync that assign these fields to Sequelize `Date` columns. Out of scope for the validation rollout. Not actively buggy — the one case that *was* (broken `PublicationDate`) is fixed.
- **Fix**: path A. Add a shared `xmlDate` helper:
  ```ts
  const xmlDate = z
    .union([z.string(), z.date()])
    .transform((v): Date | null => {
      if (v instanceof Date) return isValid(v) ? v : null;
      const parsed = parseISO(v);
      return isValid(parsed) ? parsed : null;
    })
    .nullable()
    .optional();
  ```
  Replace `z.string().optional()` with `xmlDate` on the date fields. Drop the legacy interfaces; let `z.infer` give consumers `Date | null`. Update [event.processor.ts](../apps/worker/sync/src/app/processors/sync-events-v2/tournament/processors/event.processor.ts) for the `null` case. Rewrite affected tests in [visual.service.spec.ts](../libs/backend/visual/src/services/__tests__/visual.service.spec.ts) to expect `Date` instances.
- **Status**: open. **Owner**: unowned.

### Visual API: XmlScores / XmlStats kept as z.unknown()

- **Where**: [libs/backend/visual/src/utils/visual-result.ts](../libs/backend/visual/src/utils/visual-result.ts) — `XmlScoresSchema.Score`, `XmlStatsSchema.Stat`.
- **What**: inner field is `z.unknown()`; the legacy `XmlScores` / `XmlStats` interfaces still live alongside the schemas. Every other wrapper (`XmlPlayers`, `XmlStructure`, `XmlSets`) was unified in `58bfc2456`.
- **Why we shipped it**: `arrayOf(XmlScoreSchema)` / `arrayOf(XmlStatSchema)` re-trip TS7056 ("inferred type exceeds maximum length") because the recursion `XmlMatch → XmlSets → XmlSet → XmlScores` is too deep. Nothing reads `.Score` or `.Stat` today (`ScoreStatus` is a separate top-level field), so there's no consumer pain.
- **Fix**: either explicit `z.ZodType<XmlScores>` annotations to break inference depth, or replace `XmlScoresSchema` / `XmlStatsSchema` references in `XmlSetSchema` with `z.unknown()` so the deepest layer doesn't reference them.
- **Status**: open. **Owner**: unowned.

## Frontend

### Legacy Angular frontend

- **Where**: [apps/badman/](../apps/badman/), [libs/frontend/](../libs/frontend/).
- **What**: Active frontend lives in a separate repo. Per [AGENTS.md](../AGENTS.md), this code is reference-only.
- **Why we shipped it**: kept as reference during the migration to the separate frontend repo.
- **Fix**: delete both trees and their nx project references / build targets. Verify the api app's static-file serving still works for any non-frontend assets.
- **Status**: open. **Owner**: unowned.
