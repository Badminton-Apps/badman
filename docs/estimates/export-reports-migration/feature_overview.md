# Feature Overview: Export/Report Migration (6 Reports)

## Step 1: Technical Impact Map

### Database
- **No new tables, migrations, or schema changes required.** All data already exists in the database.
- Tables read (not modified): `EventCompetitions`, `SubEventCompetitions`, `DrawCompetitions`, `EventEntries`, `Teams`, `Clubs`, `Locations`, `Availabilities`, `Players`, `RankingLastPlaces`, `RankingSystems`
- Permission strings (`export-teams:competition`, `export-exceptions:competition`, `export-locations:competition`) already exist in the database. Permissions are assigned to individual users (not roles).

### ORM / Data Layer
- **Sequelize models already exist** for all entities involved. No new models needed.
- Key access patterns: `EventCompetition.findByPk()` -> `getSubEventCompetitions()` -> `getDrawCompetitions()` -> `getEventEntries()` with includes for `Team`, `Club`, `Location`, `Availability`.
- The enrollment `ExcelService` uses N+1 pattern (`Player.findByPk` in loop) -- not ideal but out of scope unless refactoring is explicitly requested.

### Services / Business Logic
- **New:** `CompetitionExportService` (or similar) in a new backend library or within the enrollment library. Three methods needed:
  1. `getTeamsExport(eventId)` -- flatten team data, deduplicate by team ID, generate XLSX
  2. `getExceptionsExport(eventId)` -- expand date ranges, deduplicate by composite key, generate XLSX
  3. `getLocationsExport(eventId)` -- translate day names, deduplicate, generate XLSX
- **Existing (verify):** `ExcelService.GetEnrollment()` at `libs/backend/competition/enrollment/src/services/excel.services.ts`
- **Existing (verify):** `CpGeneratorService.generateCpFile()` at `libs/backend/generator/src/services/cp_generator.ts`

### GraphQL Layer
- **No changes needed.** The `averageLevel` resolver field already exists on `SubEventCompetition` and works correctly.
- The new export endpoints will be REST controllers (following the existing pattern of `EnrollemntController` and `AppController`), not GraphQL mutations.

### Frontend (New Application — Next.js 15)
The new frontend uses **TypeScript, Next.js 15 (App Router), Material UI, GraphQL (Apollo Client), React Hook Form, Biome (linting/formatting), deployed on Vercel**. Architecture uses heavy client-side components.

- **Average Level Page (Report 1):** Full client component page with a React-compatible charting library (e.g., recharts, nivo, or ApexCharts React wrapper). Requires:
  - GraphQL query via Apollo Client for `eventCompetition` -> `subEventCompetitions` -> `averageLevel`
  - Line charts with dual Y-axis (average level reversed 1-12, player count)
  - Filters: gender (M/F), chart type (single/double/mix), event type (M/F/MX)
  - CSV download button
- **Download Buttons (Reports 2-6):** Client components using MUI:
  - MUI Menu or button group on the competition detail page
  - Each button triggers a `fetch` GET to the respective endpoint
  - Response is a blob that triggers browser download
  - Permission-gated: buttons should only be visible if the user has the required permission
- **Permission-based visibility:** The frontend needs to check user permissions to conditionally render download buttons. Permissions are assigned per user.

---

## Step 2: Complexity & Risk Analysis

See `complexity_analysis.md` for the full analysis.

**Overall Risk Rating: MEDIUM**

---

## Step 3: Functional Breakdown & Estimation

### Task Table

| # | Task | Category | Complexity | Baseline Hours | AI-Adjusted Hours | Risk |
|---|------|----------|------------|----------------|-------------------|------|
| **Backend: New Export Endpoints** | | | | | | |
| 1 | Create `CompetitionExportModule` with controller and service skeleton | BE | S | 1.5 | 0.6 | Low |
| 2 | Implement `getTeamsExport()` service method (port from FE lines 156-240) | BE | M | 3 | 1.5 | Medium |
| 3 | Implement `getExceptionsExport()` service method (port from FE lines 242-350, includes date range generation, dedup, Belgian date formatting) | BE | M | 4 | 2.0 | Medium |
| 4 | Implement `getLocationsExport()` service method (port from FE lines 352-471, includes day name translation, dedup) | BE | M | 3 | 1.5 | Medium |
| 5 | Create REST controller with 3 GET endpoints (`/excel/teams`, `/excel/exceptions`, `/excel/locations`) following `EnrollemntController` pattern | BE | S | 2 | 0.8 | Low |
| 6 | Register module in API app module | BE | S | 0.5 | 0.2 | Low |
| **Backend: Security Fixes** | | | | | | |
| 7 | Add authentication + permission check to existing `EnrollemntController` (`edit:competition`) | BE | S | 1 | 0.5 | Low |
| 8 | Add authentication + permission check to existing `AppController.getCp` (`change:job`) | BE | S | 1 | 0.5 | Low |
| 9 | Add permission checks to new export controller (teams/exceptions/locations with respective permissions) | BE | S | 1.5 | 0.6 | Low |
| **Backend: Shared XLSX Utility** | | | | | | |
| 10 | Extract shared XLSX utility (autosize columns, autofilter, buffer generation) from existing patterns into a reusable module | BE | M | 2.5 | 1.2 | Low |
| **Backend: Validation & Error Handling** | | | | | | |
| 11 | Add `eventId` UUID validation and existence check to all export endpoints (new + existing) | BE | S | 1.5 | 0.6 | Low |
| 12 | Standardize error responses (404 for missing event, 403 for unauthorized, 500 for generation failure) | BE | S | 1 | 0.5 | Low |
| **Backend: Verification** | | | | | | |
| 13 | Manual verification: existing enrollment endpoint still works correctly | QA | S | 1 | 1.2 | Low |
| 14 | Manual verification: existing CP endpoint still works correctly (Windows environment) | QA | S | 1.5 | 1.8 | Medium |
| **Frontend: Average Level Page (Report 1)** | | | | | | |
| 15 | Create average level page (Next.js App Router client component with route) | FE | M | 3.5 | 1.8 | Low |
| 16 | Implement GraphQL query via Apollo Client and data transformation for average level | FE | S | 1.5 | 0.6 | Low |
| 17 | Implement chart rendering with React charting library (line charts with dual Y-axis, 3 event types x 2 genders x 3 disciplines = up to 18 charts) | FE | L | 8 | 4.0 | Medium |
| 18 | Implement CSV download from chart data | FE | S | 1 | 0.4 | Low |
| 19 | Add permission guard on route (user permission check for `edit:competition`) | FE | S | 0.5 | 0.2 | Low |
| **Frontend: Download Buttons (Reports 2-6)** | | | | | | |
| 20 | Create export MUI Menu component on competition detail page | FE | M | 2 | 0.8 | Low |
| 21 | Implement download service (fetch GET to all 5 REST endpoints) | FE | M | 2.5 | 1.0 | Low |
| 22 | Implement blob download handling (anchor click / URL.createObjectURL pattern) | FE | S | 1 | 0.4 | Low |
| 23 | Add per-user permission-based visibility for each download button | FE | S | 1.5 | 0.6 | Low |
| 24 | Loading states and error handling for downloads (MUI CircularProgress, Snackbar on error) | FE | S | 1.5 | 0.6 | Low |
| **Testing** | | | | | | |
| 25 | Unit tests for `getTeamsExport()` service (data transformation, dedup, XLSX output verification) | QA | M | 3 | 1.8 | Low |
| 26 | Unit tests for `getExceptionsExport()` service (date range generation, dedup, formatting) | QA | M | 3 | 1.8 | Medium |
| 27 | Unit tests for `getLocationsExport()` service (day translation, dedup) | QA | M | 2.5 | 1.5 | Low |
| 28 | Unit tests for permission checks on all export endpoints | QA | S | 2 | 1.2 | Low |
| 29 | Integration tests: end-to-end controller tests for new endpoints (authenticated + unauthenticated) | QA | M | 4 | 2.4 | Medium |
| 30 | Regression test: compare output of new backend exports vs. legacy frontend exports for same event | QA | M | 3 | 3.6 | High |
| **Documentation** | | | | | | |
| 31 | API documentation for new export endpoints (request/response, permissions, error codes) | DOCS | S | 1.5 | 0.6 | Low |
| 32 | Inline code comments for complex logic (date range generation, dedup, day translation) | DOCS | S | 0.5 | 0.2 | Low |

### Subtotals by Category

| Category | Baseline Hours | AI-Adjusted Hours |
|----------|----------------|-------------------|
| **BE** (Backend, incl. shared XLSX utility) | 24.0 | 11.0 |
| **FE** (Frontend — Next.js 15) | 23.0 | 10.4 |
| **QA** (Testing) | 20.0 | 15.3 |
| **DOCS** (Documentation) | 2.0 | 0.8 |
| **TOTAL** | **69.0** | **37.5** |

### Grand Total

- **AI-Adjusted Total: ~38 hours** (approximately 5 working days)
- **Suggested Sprint Allocation:** 1 sprint (2-week cadence) with 1 developer, accounting for meetings, code review, and context switching overhead
- **Range estimate:**
  - Optimistic: 30 hours (charting library integration is straightforward, no surprises)
  - Expected: 38 hours (as estimated above)
  - Pessimistic: 50 hours (React charting library differences cause rework, permission check integration on the Next.js side is more complex than expected)

### Parallelization Notes

- **Can be parallelized:**
  - Tasks 2, 3, 4 (three export service methods) are independent of each other
  - Tasks 15-19 (FE average level page) can be done in parallel with tasks 2-6 (BE export endpoints)
  - Tasks 25, 26, 27 (unit tests per service method) can be done in parallel
  - Tasks 7, 8 (security fixes) can be done in parallel with new endpoint development

- **Must be sequential:**
  - Task 1 (module skeleton) before Tasks 2-6
  - Task 5 (controller) after Tasks 2, 3, 4 (services)
  - Task 6 (module registration) after Task 5
  - Tasks 20-24 (FE download buttons) after Tasks 2-6 (BE endpoints are ready)
  - Task 29 (integration tests) after Tasks 5, 9 (controller + auth)
  - Task 30 (regression tests) after all BE and FE work is complete

### Critical Path
`Task 1 -> Tasks 2/3/4 (parallel) -> Task 5 -> Task 6 -> Task 9 -> Tasks 29/30`

---

## Agent Execution Tasks

> **Reference:** See `architecture.md` for the high-level architecture diagram, component inventory, data flow per feature, shared utilities, and integration points. All tasks below should follow the patterns and file locations defined there.

### Backend Work

1. **[BE] Extract shared XLSX utility module.**
   See `architecture.md` → "Shared Utilities / Reusable Patterns" for the target API surface.
   Create a reusable utility at `libs/backend/utils/xlsx/` with:
   - `createWorkbook()` — wraps `xlsx.utils.book_new()`
   - `addSheet(workbook, name, headers, rows)` — creates sheet from AOA with auto-sized columns and autofilter
   - `toBuffer(workbook)` — writes workbook to buffer
   - Barrel export via `index.ts`
   - Refactor existing `ExcelService.GetEnrollment()` (`libs/backend/competition/enrollment/src/services/excel.services.ts`) to use the shared utility
   - **Expected output:** Reusable XLSX utility module, existing enrollment service refactored to use it

2. **[BE] Create the `CompetitionExportModule` skeleton.**
   See `architecture.md` → "Component Inventory → New Files" for exact file locations.
   Create a new NestJS module at `libs/backend/competition/export/`:
   - `libs/backend/competition/export/src/controllers/export.controller.ts` — empty controller with `@Controller({ path: 'excel' })` decorator
   - `libs/backend/competition/export/src/services/export.service.ts` — empty injectable service class `CompetitionExportService`
   - `libs/backend/competition/export/src/export.module.ts` — registers controller + service
   - `libs/backend/competition/export/src/index.ts` — barrel export
   - Import `CompetitionExportModule` in `apps/api/src/app/app.module.ts` (see `architecture.md` → "Existing Files to Modify")
   - **Expected output:** Module compiles, controller is reachable (returns 404 on undefined routes)

3. **[BE] Implement `getTeamsExport(eventId: string)` method in `CompetitionExportService`.**
   See `architecture.md` → "Data Flow per Feature → Report 3: Download Teams" for the full request/response flow.
   Port logic from `libs/frontend/modules/excel/src/services/excel.service.ts` lines 156-240:
   - Query `EventCompetition.findByPk(eventId)` then traverse `getSubEventCompetitions()` → `getDrawCompetitions()` → `getEventEntries({ include: [{ model: Team, include: [{ model: Club }] }] })`
   - Extract unique teams (deduplicate by `team.id`) with fields: `club.clubId`, `club.name`, `team.name`, `team.preferredDay`, `team.preferredTime`
   - Generate XLSX via shared utility (task #1) with headers: `["Club ID", "Clubnaam", "Ploegnaam", "Voorkeur speelmoment (dag)", "Voorkeur speelmoment (tijdstip)"]`
   - Return `{ buffer, event }` matching the enrollment service pattern
   - **Expected output:** `CompetitionExportService.getTeamsExport()` method that returns an XLSX buffer

4. **[BE] Implement `getExceptionsExport(eventId: string)` method in `CompetitionExportService`.**
   See `architecture.md` → "Data Flow per Feature → Report 4: Download Exceptions" for the full request/response flow.
   Port logic from `libs/frontend/modules/excel/src/services/excel.service.ts` lines 242-350:
   - Traverse same hierarchy as teams but include `Club` → `Location` → `Availability` (with `exceptions` field)
   - For each exception with `start` and `end` dates, generate one row per day in the range (use `generateDateRange` helper)
   - Format dates to Belgian locale (`DD/MM/YYYY`, timezone `Europe/Brussels`) using `toLocaleDateString('nl-BE', ...)`
   - Deduplicate by composite key: `(clubId, locationName, date)`
   - Generate XLSX via shared utility (task #1) with headers: `["Club ID", "Clubnaam", "Locatie", "Datum", "Velden"]`
   - **Expected output:** `CompetitionExportService.getExceptionsExport()` method

5. **[BE] Implement `getLocationsExport(eventId: string)` method in `CompetitionExportService`.**
   See `architecture.md` → "Data Flow per Feature → Report 5: Download Locations" for the full request/response flow.
   Port logic from `libs/frontend/modules/excel/src/services/excel.service.ts` lines 352-471:
   - Traverse hierarchy to `Location` → `Availability` → `days` (array of `{ day, courts }`)
   - Build address from `location.street`, `location.streetNumber`, `location.postalcode`, `location.city` (filter falsy, join with space)
   - Translate English day names to Dutch: `{ monday: "Maandag", tuesday: "Dinsdag", wednesday: "Woensdag", thursday: "Donderdag", friday: "Vrijdag", saturday: "Zaterdag", sunday: "Zondag" }`
   - Deduplicate by composite key: `(clubId, locationName, day)`
   - Generate XLSX via shared utility (task #1) with headers: `["Club ID", "Clubnaam", "Locatie", "Adres", "Dag", "Aantal Velden"]`
   - **Expected output:** `CompetitionExportService.getLocationsExport()` method

6. **[BE] Create the export controller with 3 GET endpoints.**
   See `architecture.md` → "Component Inventory" for file location and "Data Flow per Feature" for endpoint patterns.
   In `libs/backend/competition/export/src/controllers/export.controller.ts`:
   - `GET /excel/teams?eventId={id}` → calls `competitionExportService.getTeamsExport(eventId)`
   - `GET /excel/exceptions?eventId={id}` → calls `competitionExportService.getExceptionsExport(eventId)`
   - `GET /excel/locations?eventId={id}` → calls `competitionExportService.getLocationsExport(eventId)`
   - Follow the response pattern from `EnrollemntController`: set `Content-Disposition` and `Content-Type` headers, send buffer
   - Use `@Res() res: FastifyReply` and `@Query() query: { eventId: string }` like the existing controller
   - **Expected output:** Three working endpoints that return XLSX files

7. **[BE] Add authentication and permission checks to all export endpoints.**
   See `architecture.md` → "Integration Points" for the auth pattern (`@User()` + `canExecute()`).
   - In the NEW export controller: add `@User() user: Player` parameter to each handler. Call `canExecute(user, { anyPermissions: ['export-teams:competition'] })` (or respective permission) before processing. Import from `@badman/backend-authorization` and `libs/backend/graphql/src/utils/can-exexcute.ts`.
   - In the EXISTING `EnrollemntController` (`libs/backend/competition/enrollment/src/controllers/excel.controller.ts`): add `@User() user: Player` and `canExecute(user, { anyPermissions: ['edit:competition'] })`.
   - In the EXISTING `AppController.getCp` (`apps/api/src/app/controllers/app.controller.ts` line 139): add `@User() user: Player` and `canExecute(user, { anyPermissions: ['change:job'] })`.
   - Permissions are assigned per user (not roles) and already exist in the database.
   - **Expected output:** All 5 export endpoints require authentication and check per-user permissions

8. **[BE] Add input validation to all export endpoints.**
   - Validate `eventId` is provided (400 if missing)
   - Validate `eventId` format (UUID regex, 400 if invalid)
   - Check `EventCompetition.findByPk(eventId)` returns a result (404 if not found) — do this in the service layer before traversing the hierarchy
   - **Expected output:** Proper error responses for invalid/missing eventId

### Frontend Work (Next.js 15 / App Router)

9. **[FE] Create the average level page as a Next.js client component.**
   See `architecture.md` → "Data Flow per Feature → Report 1: Average Level" for the full flow.
   Create a new page in the Next.js app:
   - Route: `/competition/[id]/avg-level` (App Router dynamic segment)
   - `'use client'` directive (heavy interactivity with charts)
   - Permission check: only accessible if user has `edit:competition`
   - Implement the GraphQL query via Apollo Client from the legacy component (lines 236-256 of `detail-avg.page.ts`):
     ```graphql
     query GetAvgLevel($id: ID!) {
       eventCompetition(id: $id) {
         id
         subEventCompetitions {
           id, name, eventType
           averageLevel { gender, single, singleCount, double, doubleCount, mix, mixCount }
         }
       }
     }
     ```
   - **Expected output:** Next.js page component that fetches and displays average level data

10. **[FE] Implement chart rendering for the average level page.**
    See `architecture.md` → "Key Technical Decisions" for charting library considerations.
    Replicate the charting logic from `detail-avg.page.ts` using a React-compatible charting library (e.g., recharts, nivo, or react-apexcharts):
    - For each combination of `eventType` (M/F/MX) x `gender` (M/F) x `chartType` (single/double/mix), render a chart if data exists
    - Chart config: dual Y-axis (left: average level 1-12 reversed with integer ticks; right: player count), straight line, data labels with 2 decimal places, dark theme
    - X-axis: subevent names filtered by event type
    - Series: "Average" (level values) and "Players" (count values)
    - Title format: `Reeks: {eventType}, Geslacht: {gender}, Dicipline: {chartType}`
    - **Expected output:** Up to 18 charts rendered on the page, matching legacy output

11. **[FE] Implement CSV download on the average level page.**
    Port the `downloadData()` and `convertToCSV()` methods from `detail-avg.page.ts` lines 194-229:
    - Headers: `name, gender, single, singleCount, double, doubleCount, mix, mixCount`
    - Rows: for each subevent, for each averageLevel entry, output `{name} - {eventType}, {gender}, {single}, ...`
    - Trigger download as `data.csv` via `URL.createObjectURL(new Blob(...))`
    - **Expected output:** CSV download button that exports chart data

12. **[FE] Create export download hooks/utility for REST endpoints.**
    See `architecture.md` → "Shared Utilities → Blob Download Pattern" for the reusable download utility pattern, and "Component Inventory" for file location.
    Create a custom hook or utility module with functions for each download:
    - `downloadEnrollment(eventId: string)` → `fetch({apiUrl}/excel/enrollment?eventId={id})`
    - `downloadTeams(eventId: string)` → `fetch({apiUrl}/excel/teams?eventId={id})`
    - `downloadExceptions(eventId: string)` → `fetch({apiUrl}/excel/exceptions?eventId={id})`
    - `downloadLocations(eventId: string)` → `fetch({apiUrl}/excel/locations?eventId={id})`
    - `downloadCp(eventId: string)` → `fetch({apiUrl}/cp?eventId={id})`
    - All functions: use the shared `downloadBlob(url, filename)` pattern
    - **Expected output:** React hook or utility with 5 download functions

13. **[FE] Create export MUI Menu on competition detail page.**
    See `architecture.md` → "Component Inventory" for file location and "Integration Points" for permission checking.
    Add a MUI `Menu` component (client component) on the competition detail page:
    - Menu items: "Gemiddeld level" (Next.js `Link` to avg-level page), "Download basis spelers", "Download ploegen", "Download uitzonderingen", "Download locaties", "Download cp file"
    - Each download item: calls the corresponding download function, shows `CircularProgress` during download, shows `Snackbar` on error
    - Per-user permission-gated visibility:
      - "Gemiddeld level" + "Download basis spelers": visible if user has `edit:competition`
      - "Download ploegen": visible if user has `export-teams:competition`
      - "Download uitzonderingen": visible if user has `export-exceptions:competition`
      - "Download locaties": visible if user has `export-locations:competition`
      - "Download cp file": visible if user has `change:job`
    - **Expected output:** Functional MUI export menu with per-user permission-based rendering

### Testing

14. **[QA] Write unit tests for shared XLSX utility.**
    Test the utility created in task #1:
    - Test: `createWorkbook()` returns valid workbook
    - Test: `addSheet()` produces correct headers, rows, autofilter, and auto-sized columns
    - Test: `toBuffer()` returns a valid XLSX buffer that can be parsed back
    - **Expected output:** Passing test suite for shared utility

15. **[QA] Write unit tests for `CompetitionExportService.getTeamsExport()`.**
    Test file: alongside the service file.
    - Test: correct XLSX output for a known input (mock Sequelize models)
    - Test: deduplication works (same team appearing in multiple draws produces one row)
    - Test: empty event (no sub-events) produces XLSX with only headers
    - Test: missing club data handles gracefully (empty strings in output)
    - **Expected output:** Passing test suite

16. **[QA] Write unit tests for `CompetitionExportService.getExceptionsExport()`.**
    - Test: date range generation (single day, multi-day range, start-only with no end)
    - Test: Belgian date formatting
    - Test: deduplication by composite key (clubId + locationName + date)
    - Test: empty exceptions array produces headers-only XLSX
    - **Expected output:** Passing test suite

17. **[QA] Write unit tests for `CompetitionExportService.getLocationsExport()`.**
    - Test: day name translation (all 7 days EN → NL)
    - Test: address construction from parts
    - Test: deduplication by composite key
    - **Expected output:** Passing test suite

18. **[QA] Write unit tests for permission checks on export endpoints.**
    See `architecture.md` → "Integration Points" for the auth pattern being tested.
    - Test: unauthenticated request returns 401
    - Test: authenticated user without required permission returns 403
    - Test: authenticated user with correct permission returns 200
    - Cover all 5 endpoints (enrollment, teams, exceptions, locations, CP)
    - **Expected output:** Passing test suite

19. **[QA] Write integration tests for new export controller.**
    Following existing test patterns in `libs/backend/competition/enrollment/src/services/validate/enrollment.service.spec.ts`:
    - Test: end-to-end request through controller → service → XLSX response
    - Test: correct Content-Type and Content-Disposition headers
    - Test: 404 for non-existent eventId
    - Test: 400 for missing/invalid eventId
    - **Expected output:** Passing integration test suite

20. **[QA] Regression testing: compare new backend exports vs. legacy frontend exports.**
    For a known test event:
    - Generate teams/exceptions/locations XLSX from both the legacy frontend and the new backend endpoint
    - Compare row counts, column values, and formatting
    - Document any intentional differences
    - **Expected output:** Regression test report confirming output parity

### Documentation

21. **[DOCS] Document new export API endpoints.**
    Refer to `architecture.md` → "Data Flow per Feature" for the authoritative endpoint specs.
    Add documentation (inline JSDoc on controller methods or a separate API doc):
    - Endpoint URLs, HTTP methods, query parameters
    - Required permissions per endpoint
    - Response format (Content-Type, file naming convention)
    - Error codes: 400 (bad request), 401 (not authenticated), 403 (forbidden), 404 (event not found), 500 (generation failure)
    - **Expected output:** API documentation for 5 export endpoints

22. **[DOCS] Add inline code comments for ported business logic.**
    In the `CompetitionExportService`:
    - Comment the date range generation algorithm
    - Comment the deduplication strategy and composite key fields
    - Comment the day name translation map
    - Reference the original frontend source locations for traceability
    - **Expected output:** Well-commented service methods

---

## Resolved Questions

1. **New frontend framework:** Next.js 15 (App Router) with TypeScript, Material UI, Apollo Client, React Hook Form, Biome, deployed on Vercel. FE estimates adjusted accordingly.
2. **Permission seeding:** Permissions already exist in the database. They are assigned to individual users (not roles). No seeding task needed.
3. **CP file cross-platform requirement:** The `.cp` file is for the "Competition Planner" desktop software. It only needs to work on OS's that can run that software. No cross-platform concern — the existing Windows-only ADODB approach is fine.
4. **Data volume:** Unknown. Keeping current approach (in-memory XLSX generation, matching existing patterns). If performance issues surface at scale, this can be optimized later.
5. **Shared XLSX utility:** Yes — extract into a reusable module. This will be needed again for future exports. Added as task #10.
