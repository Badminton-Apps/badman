/**
 * Integration tests for TeamRenumberingService + TeamRenumberResolver.
 *
 * These tests require a running PostgreSQL database and exercise real
 * advisory-lock behaviour. They are SKIPPED unless RUN_INTEGRATION_TESTS=1
 * is set in the environment.
 *
 * Prerequisites:
 *   npm run docker:up        # start postgres + redis
 *   RUN_INTEGRATION_TESTS=1 npx jest --config libs/backend/graphql/jest.config.ts \
 *     --testPathPattern team-renumbering.integration
 *
 * Spec: specs/008-reorder-teams-atomic/
 * Tests: T024–T028 (User Story 3: Concurrent recalculate calls never corrupt state)
 */

const RUN = process.env["RUN_INTEGRATION_TESTS"] === "1";

// ---------------------------------------------------------------------------
// Describe block — all tests are skipped unless RUN_INTEGRATION_TESTS=1
// ---------------------------------------------------------------------------

(RUN ? describe : describe.skip)("TeamRenumberingService integration — concurrency", () => {
  // T025: 10 parallel calls against a single-type scope
  it.todo(
    "10 parallel calls against the same single-type scope produce {1..N} in ascending baseIndex order with no _temp"
  );

  // T026: 10 parallel calls against pooled MX+NAT scope
  it.todo(
    "10 parallel calls against pooled MX+NAT scope: NATIONAL takes 1..K, MX takes K+1..K+M, no _temp"
  );

  // T027: parallel updateTeam calls do not write teamNumber during a recalculate
  it.todo(
    "parallel updateTeam roster edits while a recalculate is in flight do not write teamNumber/name/abbreviation"
  );

  // T037: rejected recalculate (unauthorized) leaves scope unchanged
  it.todo(
    "rejected recalculate (unauthorized caller) leaves all teams in the scope byte-identical to pre-call snapshot"
  );
});
