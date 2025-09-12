const axios = require("axios");

const encounterIds = [];

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
        concurrency: 1,
      },
      removeOnComplete: true,
      removeOnFail: true,
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
