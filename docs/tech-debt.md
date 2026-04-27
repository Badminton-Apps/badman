# Technical debt registry

Living catalogue of known compromises, lying types, dead code, deferred refactors, and other "we know it's not great" items in the codebase. The point isn't to feel bad about debt — it's to make sure nothing **silent** is hiding, so when someone has time / motivation / a related touch, they know where to look.

## How to use this document

### When to add an entry

Add an entry as soon as you **knowingly** ship a compromise. "Knowingly" is the bar — code that's bad because we didn't notice doesn't belong here, code that's bad because we weighed the tradeoff and chose to ship anyway does. Examples that should land here:

- A type that lies about its runtime shape (interface says `Date`, runtime is `string`).
- A workaround for a third-party bug or a tool limitation (e.g. `// TS7056`, "fast-xml-parser quirk").
- A dead-code branch we left in because removing it would expand scope.
- A migration that's been started but not finished (legacy module still wired).
- A "TODO: remove once X" comment with a real condition we can check for.
- A test we skipped or couldn't write (and why).
- A duplicated implementation we'll consolidate "later".

Don't add entries for: things you'd routinely fix in a small refactor, micro-optimisations, taste-level preferences, or hypothetical concerns that haven't bitten anything.

### When to remove an entry

Remove the entry **in the same commit that resolves the debt**. Don't let the registry rot — a stale entry pointing at code that's already been fixed is worse than no entry. If the situation changed but the debt persists in a new form, edit the entry rather than removing it; note the change in the **Status** line.

### Entry format

Each entry is a `### <short title>` heading followed by these labelled lines (skip any that don't apply):

- **Where**: file path(s) and the relevant symbol/line. Use markdown links so they're clickable.
- **What**: one or two sentences on what the debt is.
- **Why we shipped it**: the tradeoff at the time. *Required* — without this, future-you can't judge whether the original reasoning still applies.
- **What it would take to fix**: rough effort (hours / half-day / day / "real refactor"), key risks, files that would need to change.
- **Trigger to revisit**: the concrete condition under which fixing this becomes worthwhile (a feature request, a bug class repeating, a major version bump that gives us better tools, etc.).
- **Status**: `open` / `partial fix in <commit>` / `blocked on <reason>`. Default: `open`.
- **Owner**: name or `unowned`. Default: `unowned`.

Keep entries short. If something needs more than ~15 lines to explain, write a separate doc and link to it from the entry.

### Order

Group by area (Backend, Frontend, Worker, Build/Tooling, etc.), then within each area roughly by impact (worst first). Add an explicit `### <name>` heading per entry; don't bundle multiple debts under one heading.

### Review cadence

Skim the doc once per quarter (or before major refactors that touch a debt area). Resolve, update, or rewrite stale entries. If an entry has a **Trigger to revisit** that has fired, mention it in the next stand-up / planning session.

---

## Backend

### Visual API: schema/interface duality on Date-typed fields

- **Where**: [libs/backend/visual/src/utils/visual-result.ts](../libs/backend/visual/src/utils/visual-result.ts) — `XmlTournament`, `XmlMatch`, `XmlTeamMatch`, `XmlItem` interfaces vs their `*Schema` zod schemas.
- **What**: ~16 date-shaped fields (`StartDate`, `EndDate`, `MatchTime`, `LastUpdated`, all the various `*PublicationDate` fields on `XmlTournament`) are typed as `Date` in the consumer-facing interfaces but as `string` in the runtime zod schemas. The schemas validate the truthful shape; the interfaces preserve the contract that worker-sync consumers compile against.
- **Why we shipped it**: collapsing to single source of truth requires either (a) transforming strings → Date inside the schema via `z.string().transform(parseISO)`, or (b) updating ~20 consumer call sites in worker-sync that assign `tournament.StartDate` directly to a Sequelize `Date` column. Both were out of scope for the validation rollout that surfaced this. The lying type isn't actively causing bugs (the broken `PublicationDate` case was the one we *did* fix — see [apps/worker/sync/src/app/processors/sync-ranking/ranking-utils.ts](../apps/worker/sync/src/app/processors/sync-ranking/ranking-utils.ts) `parsePublicationDate`).
- **What it would take to fix**: ~1 day. Recommended approach: **path A — schemas transform**. Add a shared `xmlDate` helper:

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

  Replace `LastUpdated: z.string().optional()` etc. with `LastUpdated: xmlDate` in `XmlTournamentSchema`, `XmlMatchSchema`, `XmlTeamMatchSchema`, `XmlItemSchema`. Drop the legacy interfaces; let `z.infer` give consumers `Date | null` directly. Touch points to verify:
  - [event.processor.ts](../apps/worker/sync/src/app/processors/sync-events-v2/tournament/processors/event.processor.ts) — `event.firstDay = visualTournament.StartDate` works because Sequelize accepts `Date`. `null` would need a guard.
  - Tests in [visual.service.spec.ts](../libs/backend/visual/src/services/__tests__/visual.service.spec.ts) currently assert on string dates (e.g. `"2026-04-15T19:00:00"` from `getDate`); rewrite to expect `Date` instances.
  - Worker-sync specs that fixture-mock dates need their expectations updated.

  Risk: medium. Unparseable date strings become `null` instead of Invalid Date. Any consumer that pipes through to `dbColumn = xmlDate` will need a `if (xmlDate)` guard.
- **Trigger to revisit**: next time we add a Visual API getter that introduces new date fields, or the next time a date-format change from toernooi.nl causes a sync regression (the `parsePublicationDate` style fallback would already handle it, but at the wrong layer).
- **Status**: open.
- **Owner**: unowned.

### Visual API: deeply-nested wrapper types kept as `z.unknown()`

- **Where**: [libs/backend/visual/src/utils/visual-result.ts](../libs/backend/visual/src/utils/visual-result.ts) — `XmlScoresSchema.Score` and `XmlStatsSchema.Stat`.
- **What**: these two wrapper schemas leave their inner field typed as `z.unknown()` instead of `arrayOf(InnerSchema)`. The legacy `XmlScores` / `XmlStats` interfaces still exist alongside the schemas to give consumers the array contract; everything else (`XmlPlayers`, `XmlStructure`, `XmlSets`) was unified in `58bfc2456`.
- **Why we shipped it**: trying to use `arrayOf(XmlScoreSchema)` and `arrayOf(XmlStatSchema)` re-triggered TS7056 ("inferred type exceeds maximum length"). These wrappers sit at the deepest level of the type graph (`XmlMatch → XmlSets → XmlSet → XmlScores`) so the recursive inference explodes. Crucially, **nothing in the codebase reads `.Score` or `.Stat` today** (`ScoreStatus` is a separate top-level field on `XmlMatch`), so there's no consumer pain to justify fighting the type system here.
- **What it would take to fix**: a few hours. Two viable approaches: (a) add explicit `z.ZodType<XmlScores>` annotations to the schemas to break inference depth, or (b) flatten `XmlSet` so it doesn't reference `XmlScoresSchema` / `XmlStatsSchema` directly (replace the field with `z.unknown()` inside `XmlSetSchema` while leaving the wrappers themselves typed). Smaller risk than the date-fields debt because no consumers currently care.
- **Trigger to revisit**: the first time a feature actually reads `.Scores.Score` or `.Stats.Stat`, or if we upgrade zod to a major version that changes the type-inference behaviour.
- **Status**: open.
- **Owner**: unowned.

### Frontend (Angular): legacy app and frontend libs

- **Where**: [apps/badman/](../apps/badman/), [libs/frontend/](../libs/frontend/).
- **What**: Legacy Angular frontend tracked in this repo. The active frontend lives in a separate repo. Per [AGENTS.md](../AGENTS.md), this code is reference-only and must not be used for new development.
- **Why we shipped it**: kept around as a reference during the migration to the separate frontend repo.
- **What it would take to fix**: delete the apps/badman/ and libs/frontend/ trees plus their nx project references and build targets, once the migration is fully verified. Likely a 1–2 day cleanup with regression risk on the api app's static-file serving.
- **Trigger to revisit**: when the new frontend repo is the only consumer of the API in production for one full release cycle.
- **Status**: open.
- **Owner**: unowned.
