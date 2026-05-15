# Feature Specification: Twizzit Shadow Sync

**Feature Branch**: `017-speckit-git-feature`  
**Created**: 2026-05-15  
**Status**: Draft  
**Input**: User description: "Next step in my process of integrating the twizzit API into this application are "shadow" tables. I want to just store all data coming in from Twizzit, so that we can compare that data to the data we currently have in the database.
Goal:
- Have the Twizzit data stored locally
- Figure out a good way of syncing twizzit to those tables:
    - They have a lot of data, and we quickly hit rate limits
    - They don't provide any means of checking when data was last updated. They are in the process of adding that, but it's not clear when that will happen."

## Scope clarifier *(read first)*

This specification covers **initial ingestion only**: shadow tables populated from Twizzit via a dedicated sync worker.

**In scope**

- Local shadow storage for Twizzit source data (separate from operational Badman records)
- A **separate worker process** on Render that runs the sync (not the main API web service)
- One-time or **few** full-load runs to capture initial data, with resumable progress and rate-limit handling
- Operational visibility for each sync run (status, volume, failures)

**Out of scope for this spec** (follow-up work after shadow data exists)

- Comparing shadow data to existing platform data (mismatch reports, reconciliation, stale-vs-production flags)
- Ongoing scheduled sync as a long-term product feature (may become unnecessary if Twizzit ships `lastModifiedDate` and a slimmer incremental sync replaces this approach)

**Lifecycle note**: This worker-based bulk ingest is intentionally **temporary**. It exists to backfill shadow tables while Twizzit does not expose reliable change metadata. If Twizzit adds `lastModifiedDate` (or equivalent), this one-off/few-run worker pattern may be retired in favour of a different sync design.

## References & dependencies

- **Domain & API documentation**: [`docs/twizzit/`](../../docs/twizzit/) — requirements, endpoint shapes, exploration notes, swagger captures, gaps, and implementation roadmap. Authoritative API surface for Badminton Belgium is also in the live Swagger linked from [`docs/twizzit/twizzit-api-reference-index.md`](../../docs/twizzit/twizzit-api-reference-index.md).
- **HTTP client library**: [`libs/integrations/twizzit-client/`](../../libs/integrations/twizzit-client/) — read-only, typed Twizzit access with zod validation (delivered under spec `015-twizzit-api-client`). The shadow sync worker MUST call Twizzit only through this library, not ad-hoc HTTP.
- **Prior integration spec**: `015-twizzit-api-client` (client only; no persistence).

## Domain context *(from Twizzit docs)*

Relevant facts for shadow storage and for later comparison work (comparison itself is out of scope here):

| Topic | Detail |
| --- | --- |
| **Entities to ingest** | At minimum the read endpoints the integration will use: **contacts**, **memberships**, **membership types**, **extra fields** (schema), and **organizations** (reference). Shadow tables should hold what the API returns for each, not a trimmed subset. |
| **Contact = person** | Twizzit couples each member 1:1 with a contact. Primary stable key: **`contact.id`** (future Badman `twizzitId`). |
| **Player natural key** | Twizzit treats a person as unique on **first name + last name + date of birth** (API wire: `first-name`, `last-name`, `date-of-birth`; client exposes `firstName`, `lastName`, `dateOfBirth`). Badman will eventually mirror this rule when reconciling to `Player` ([`docs/twizzit/Requirements.md`](../../docs/twizzit/Requirements.md) F2.4). Shadow ingest MUST store these fields verbatim so later matching and duplicate analysis are possible. |
| **Federation member id** | The [toernooi.nl](http://toernooi.nl) / federation id is **not** on the contact root — it lives in `extra-field-values` under the `"Member ID"` field. Shadow payloads must preserve `extra-field-values` (and nested extra-field metadata) intact. |
| **Memberships as hub** | For ongoing production sync, Twizzit advised driving from **memberships** (smaller churn than ~160k+ contacts). For this **initial shadow backfill**, a full paginated pull of all configured entity types is still required so the local copy is complete for later diffing. |
| **No change cursor** | No `last-modified` filter today; bulk paginated pulls with rate-limit discipline are the only option until Twizzit ships one. |

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capture Twizzit Data Locally (Priority: P1)

As a platform operator, I can store all Twizzit records in a dedicated shadow dataset so the imported source data is available locally for later analysis and comparison work.

**Why this priority**: Without a complete local copy of Twizzit data, no downstream comparison or reconciliation can be attempted.

**Independent Test**: Can be fully tested by running an initial import for a known Twizzit scope and verifying that all returned source records are persisted and queryable from the local shadow dataset.

**Acceptance Scenarios**:

1. **Given** a valid Twizzit dataset is available, **When** an initial import runs, **Then** all received Twizzit records are stored in the local shadow dataset with source identifiers and fetch metadata.
2. **Given** Twizzit returns nested or related records, **When** the import runs, **Then** relationships are preserved so records can be reconstructed for future use.
3. **Given** a contact record, **When** it is stored in shadow, **Then** `firstName`, `lastName`, `dateOfBirth`, `contact.id`, and full `extra-field-values` (including Member ID) are retained as returned by the API.

---

### User Story 2 - Initial Sync via Dedicated Worker (Priority: P1)

As a platform operator, I can run one or a few full-load sync jobs on Render using a **separate worker service** that progresses through large Twizzit datasets without overloading the main API or exceeding rate limits, and that can resume after interruption.

**Why this priority**: Twizzit volume and rate limits require an isolated, batch-oriented process; the main web service must not own this workload.

**Independent Test**: Can be fully tested by starting the worker in a controlled environment with simulated rate limiting and interruptions, then verifying progress resumes from the last completed checkpoint and the worker can be stopped after initial data is loaded.

**Acceptance Scenarios**:

1. **Given** the sync worker is deployed separately from the API on Render, **When** an operator starts an initial full-load job, **Then** ingestion runs in the worker without impacting normal API request handling.
2. **Given** the sync process encounters an API rate-limit response, **When** the sync is running, **Then** it pauses and retries according to configured throttling rules instead of failing permanently.
3. **Given** a sync run is interrupted mid-job, **When** the worker restarts, **Then** it continues from the most recent saved checkpoint and does not reprocess already completed chunks unnecessarily.
4. **Given** initial data has been fully loaded, **When** no further backfill is needed, **Then** the worker does not need to run on a recurring schedule (it may remain available for a manual re-run only).

---

### Edge Cases

- What happens when Twizzit returns partial data for a page or entity due to transient API errors?
- How does the system handle source records that disappear from Twizzit between sync runs?
- How does the system handle duplicate source identifiers or conflicting payload shapes across sync runs?
- What happens when multiple contacts share the same first-name + last-name + date-of-birth triple (Twizzit's uniqueness rule violated in source data)?
- What happens when `date-of-birth` is null on a contact (observed in live fixtures) — is the record still stored completely for manual review?
- What happens when a full refresh cannot complete in one window because rate limits are stricter than expected?
- What happens when Twizzit later exposes `lastModifiedDate` — is the bulk worker still needed, or can it be decommissioned?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST store all ingested Twizzit records in a dedicated local shadow dataset that is separate from operational business records.
- **FR-002**: The system MUST preserve Twizzit source identifiers and relationship context for each stored shadow record (e.g. `contact-id`, `club-id`, `membership-type-id` on memberships).
- **FR-002a**: For contacts, the system MUST preserve identity fields used by Twizzit for person uniqueness (`firstName`, `lastName`, `dateOfBirth`) and the full `extra-field-values` payload (including Member ID).
- **FR-003**: The system MUST record ingestion metadata for each shadow record, including at least the fetch timestamp and sync run identifier.
- **FR-004**: The system MUST support an initial full-load sync that can import the entire configured Twizzit scope.
- **FR-005**: Sync MUST run in a **separate worker process** from the main application API (deployed as its own Render service), not as part of the web/API process.
- **FR-006**: The sync process MUST be designed for **one-time or few** full-load executions to backfill shadow tables, not as an open-ended recurring production schedule (unless explicitly re-triggered for another backfill).
- **FR-007**: The sync process MUST respect configurable request pacing limits to reduce rate-limit violations.
- **FR-008**: When rate limits are hit, the sync process MUST retry automatically with backoff and continue until completion or an explicit stop condition is reached.
- **FR-009**: The system MUST persist sync progress checkpoints so interrupted sync runs can resume without restarting the entire dataset.
- **FR-010**: The system MUST provide operational visibility for each sync run, including status, duration, volume processed, and failure reasons.
- **FR-011**: Operators MUST be able to trigger another full or partial backfill run manually when data completeness is in doubt (without requiring a permanent cron).

### Key Entities *(include if feature involves data)*

- **Shadow Contact**: Twizzit person record (`GET /contacts`), keyed by `contact.id`, carrying `firstName`, `lastName`, `dateOfBirth`, and embedded extra-field values (Member ID and others).
- **Shadow Membership**: Club–contact–type link (`GET /memberships`), keyed by membership `id`, referencing `contact-id`, `club-id`, `membership-type-id`, dates, and optional extra-field values.
- **Shadow Reference Data**: Membership types, extra-field definitions, and organization metadata — stored for context and later reconciliation.
- **Shadow Record** (generic): Any row above, plus ingestion metadata (fetch time, sync run id, raw or normalised payload as designed in planning).
- **Sync Run**: A tracked execution of the worker that imports Twizzit data, including start/end time, status, pacing configuration, and aggregate counters.
- **Sync Checkpoint**: A progress marker indicating the latest completed unit in a sync run so processing can resume after interruptions.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An initial full-load run captures at least 99% of retrievable records in the configured Twizzit scope, with any skipped records explicitly listed.
- **SC-002**: Sync workload runs only on the dedicated worker service; the main API service shows no material increase in latency or error rate during backfill.
- **SC-003**: After an unplanned interruption, sync resumes from a saved checkpoint within 15 minutes and avoids reprocessing more than 5% of previously completed units.
- **SC-004**: Operators can confirm backfill completion from sync run status and record counts without running any comparison or reconciliation step.

## Assumptions

- The application is hosted on **Render**; the sync worker is provisioned as a **separate Render service** from the API.
- All Twizzit HTTP access goes through **`libs/integrations/twizzit-client`** (spec `015-twizzit-api-client`); the worker does not implement its own client.
- Internal design details (schema layout, pagination order, Render service definition) are left to `/speckit-plan`, informed by [`docs/twizzit/`](../../docs/twizzit/).
- Twizzit API endpoints remain accessible and continue returning stable identifiers for entities.
- Twizzit does **not** yet provide reliable `lastModifiedDate` (or equivalent); full scans are acceptable for this phase.
- If Twizzit adds change metadata, this bulk-ingest worker may be **deprecated** in favour of a different sync approach; this spec does not commit to maintaining the worker long term.
- **Comparison** of shadow data to existing Badman data is explicitly deferred to a **later spec** after shadow tables are populated.
- User-facing dashboards for sync status are out of scope; logs and run metadata suffice for v1.
