const axios = require("axios");

/**
 * Test Script for Enter Scores Processor
 *
 * This script allows you to manually trigger EnterScores jobs for testing purposes.
 * It sends HTTP requests to the queue API to add jobs to the sync queue.
 *
 * SETUP:
 * 1. Make sure your API server is running on localhost:5010
 * 2. Ensure the sync worker is running to process the jobs
 * 3. Add encounter IDs to the encounterIds array below
 *
 * USAGE:
 * 1. Add encounter UUIDs to the encounterIds array (one per line)
 * 2. Run the script: `node scripts/test-enter-scores.js`
 * 3. Monitor the console output for job submission results
 * 4. Check the worker logs to see job processing
 *
 * ENVIRONMENT VARIABLES (for testing):
 * - VISUAL_SYNC_ENABLED=true     # Shows browser window for debugging
 * - ENTER_SCORES_ENABLED=true    # Actually saves data (use carefully!)
 * - HANG_BEFORE_BROWSER_CLEANUP=true  # Keeps browser open for inspection (ONLY FOR DEVELOPMENT!,
 * and you will have to clean up instances manually in the tmp directory)
 * - DEV_EMAIL_DESTINATION=your-email@example.com  # Get notifications
 *
 * FINDING ENCOUNTER IDS:
 * You can find encounter IDs from:
 * - Database: SELECT id FROM "EncounterCompetitions" WHERE ...
 * - GraphQL: Query encounters and copy the ID field
 * - Admin panel: Look at encounter URLs or inspect elements
 *
 * EXAMPLE encounterIds:
 * const encounterIds = [
 *   "12345678-1234-1234-1234-123456789abc",
 *   "87654321-4321-4321-4321-cba987654321",
 * ];
 *
 * JOB CONFIGURATION:
 * - queue: "sync" - Uses the sync queue
 * - job: "EnterScores" - Triggers the EnterScores processor
 * - removeOnComplete/removeOnFail: true - Cleans up completed jobs
 * - backoff: exponential - Retries with exponential backoff on failure
 *
 * MONITORING:
 * - Watch console output for HTTP request results
 * - Check worker logs for detailed processing information
 * - Look for email notifications if DEV_EMAIL_DESTINATION is set
 * - Monitor browser windows if VISUAL_SYNC_ENABLED=true
 */

const encounterIds = [
  // "33ade599-8009-49d8-9acd-54e1336f9657",
  // "66835f20-177b-4826-a3ca-ce9e1fb6b487",
  // "089744c5-225b-4210-92a9-da81b970ebea",
];

const endpoint = "http://localhost:5010/api/v1/queue-job";

async function addJobsToQueue() {
  console.log(`Adding ${encounterIds.length} EnterScores jobs to the queue...`);
  console.log(`Endpoint: ${endpoint}`);
  console.log("----------------------------------------");

  for (let i = 0; i < encounterIds.length; i++) {
    const encounterId = encounterIds[i];

    console.log(`[${i + 1}/${encounterIds.length}] Adding job for encounter: ${encounterId}`);

    const payload = {
      queue: "sync",
      job: "EnterScores",
      jobArgs: {
        encounterId: encounterId,
      },
      removeOnComplete: true,
      removeOnFail: true,
      backoff: {
        type: "exponential",
      },
    };

    try {
      const response = await axios.post(endpoint, payload, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("  ✅ Job added successfully");
      console.log(`  Response: ${JSON.stringify(response.data)}`);
    } catch (error) {
      console.log("  ❌ Failed to add job");
      console.log(`  Error: ${error.message}`);
    }

    console.log("----------------------------------------");

    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log("All jobs have been submitted!");
  console.log("You can now monitor the queue and logs to see the new per-job browser behavior.");
}

addJobsToQueue().catch(console.error);
