# Complexity & Risk Analysis: Export/Report Feature Migration

## 1. Security

### Findings
- **Existing enrollment endpoint (`EnrollemntController`) has NO authentication or authorization guard.** Any unauthenticated request to `GET /excel/enrollment?eventId={id}` can download player enrollment data (names, member IDs, gender). This is a pre-existing vulnerability that MUST be fixed during this migration.
- **Existing CP endpoint (`AppController.getCp`) also has NO authentication guard.** The `queue-job` endpoint in the same controller does check `change:job` permission, but `getCp` does not.
- The authorization pattern in this codebase is inline: `@User() user: Player` decorator extracts the authenticated user, then `user.hasAnyPermission([...])` or the `canExecute()` utility (`libs/backend/graphql/src/utils/can-exexcute.ts`) performs the check. There is no route-level guard on REST controllers -- only on GraphQL mutations.
- **New endpoints (teams, exceptions, locations)** need the correct permissions: `export-teams:competition`, `export-exceptions:competition`, `export-locations:competition`. These permission strings already exist in the database and are assigned to individual users.
- Input validation: `eventId` is passed as a query parameter with no validation (no UUID format check, no existence check before heavy DB queries). All new and existing endpoints should validate this.

### Risk: HIGH
Two existing endpoints are completely unprotected. Permission strings already exist in the database but need to be enforced on the endpoints.

---

## 2. Privacy

### Findings
- **Report 1 (Average Level):** Aggregated/anonymized data only (averages per subevent). No PII concern.
- **Report 2 (Base Players):** Contains player first name, last name, member ID, and gender. This is PII. The endpoint is currently unprotected.
- **Report 3 (Teams):** Contains club names, team names, preferred play times. Low PII risk (organizational data).
- **Report 4 (Exceptions):** Contains club names and location names with date ranges. Low PII risk.
- **Report 5 (Locations):** Contains addresses (street, number, postal code, city). This is location data tied to clubs -- could be considered sensitive for smaller clubs using private venues.
- **Report 6 (CP File):** Contains player data, team data, club data, locations -- full competition data. This is a comprehensive data export with high PII content.
- No audit logging is present on any export endpoint. For compliance, downloads of PII-containing reports should be logged.
- [ASSUMPTION] GDPR applies (Belgian/Flemish badminton context). No data retention or consent mechanism is currently in place for exports.

### Risk: MEDIUM
PII is exposed in reports 2 and 6, and partially in report 5. Adding auth gates mitigates the most critical risk. Audit logging is recommended but could be deferred.

---

## 3. Data Consistency

### Findings
- **Average Level calculation** is computationally expensive (traverses draws -> encounters -> games -> players -> ranking places) but is cached for `CACHE_TTL` (likely 1 week based on the comment). No race condition risk since it's read-only and the cache key is per-subevent.
- **Teams/Exceptions/Locations exports** traverse the `EventCompetition -> SubEventCompetition -> DrawCompetition -> EventEntry -> Team -> Club -> Location -> Availability` hierarchy. This is a deeply nested read query. If data changes mid-generation (e.g., a team is removed), the output could be inconsistent, but this is acceptable for a point-in-time report.
- **CP file generation** is an 817-line service that performs many sequential database reads and ADODB writes. It uses no transaction for the read side. If competition data changes during generation, the CP file could be inconsistent. This is a pre-existing risk, not introduced by the migration.
- **Deduplication logic** in the frontend excel service (teams by team.id, exceptions by clubId+locationName+date, locations by clubId+locationName+day) must be faithfully replicated in the backend. Any deviation will produce different output than the legacy app.
- The frontend `EVENT_TEAMS_EXPORT_QUERY` in `excel.service.ts` includes `club.clubId` but the query in `export.query.ts` does NOT include `clubId` -- only `club.id` and `club.name`. There is a discrepancy between the two query definitions. The `excel.service.ts` version is authoritative since it generates the actual export.

### Risk: MEDIUM
The main risk is faithfully replicating the deduplication and data transformation logic from the frontend to the backend. The GraphQL query discrepancy needs resolution.

---

## 4. SOLID Principles

### Findings
- **Single Responsibility:** The existing `ExcelService` in the enrollment module handles only enrollment exports -- good. The new export services (teams, exceptions, locations) should each be in their own service or a single `CompetitionExportService` with clearly separated methods. The frontend `ExcelService` currently handles all three in one class (lines 156-471), which is acceptable for a service with related methods.
- **Open/Closed:** The existing `EnrollmentModule` registers its own controller and service. New export endpoints should be in a new module (e.g., `CompetitionExportModule`) rather than stuffing more controllers into the enrollment module, which is specifically for enrollment validation.
- **Dependency Inversion:** The backend services directly import Sequelize models (`EventCompetition.findByPk(...)`) -- this is the established pattern across the entire codebase. No repository abstraction exists. Consistent with existing architecture; introducing a new pattern would violate consistency.
- **Interface Segregation:** The `ExcelService` in the frontend bundles three unrelated export methods. In the backend, keeping them in one service class is acceptable given they share the same data access pattern (event -> subevent -> draw -> entry -> team -> club hierarchy).

### Risk: LOW
No architectural compromises needed. Follow existing patterns.

---

## 5. Operational Risk

### Findings
- **ADODB / CP Generator:** The `CpGeneratorService` dynamically imports `node-adodb` (`this._getAdob()`), which is a Windows-only library that shells out to a VBScript process to interact with Microsoft Access databases. The `.cp` file is specifically for the "Competition Planner" desktop software, which itself only runs on Windows. The code gracefully returns `undefined` if ADODB is not available (line 63-66). This is a pre-existing and accepted limitation — no cross-platform concern since the target users run Windows.
- **Performance at scale:** The deeply nested GraphQL queries (4-5 levels of nesting) could be slow for large competitions with many teams. The enrollment export does N+1 queries (`Player.findByPk` in a loop, line 49). This is a pre-existing performance issue.
- **Deployment:** No feature flag mechanism was observed. If the new frontend is deployed independently from the backend, there is no coordination risk -- the backend endpoints are additive.
- **Rollback:** All new endpoints are additive (new controller, new services). Rollback = revert the deployment. No database migration is needed for these features, so no migration rollback is required.
- **File size:** XLSX generation happens in-memory. For very large competitions, this could cause memory pressure. The enrollment export already works this way, so the pattern is established and presumably tested at production scale.

### Risk: MEDIUM
ADODB cross-platform limitation is the biggest operational concern. Memory usage for large exports is a secondary concern. No database migrations reduce deployment risk.

---

## Overall Risk Rating: MEDIUM

The primary risks are:
1. **Security gaps** on existing endpoints (HIGH individual risk, but straightforward to fix)
2. **ADODB Windows dependency** (pre-existing, not solvable in this scope)
3. **Faithful replication** of frontend data transformation logic to backend (MEDIUM, requires careful testing)
