"use strict";

/**
 * `change:job` gates every cronjob and queue operation (runCronJob, updateCronJob,
 * the cronJobs query, the queue resolver and POST /queue-job). It predates
 * migration-based claim seeding, so it exists only as a hand-inserted row on
 * long-lived databases — a fresh database has no way to grant it.
 *
 * Insert is guarded on the name because existing databases already have this row
 * (with their own id), and `Claims` is unique on (name, category). The category
 * matches the value already used in production: "job".
 */
const claim = {
  id: "f4b91170-ca0e-4c29-b5f6-b654ccaad00f",
  name: "change:job",
  description: "Run and edit cron jobs, and inspect the queues",
  category: "job",
  type: "global",
};

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM security."Claims" WHERE name = :name LIMIT 1`,
        {
          replacements: { name: claim.name },
          type: queryInterface.sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );

      if (existing) {
        return;
      }

      await queryInterface.bulkInsert(
        { tableName: "Claims", schema: "security" },
        [{ ...claim, createdAt: new Date(), updatedAt: new Date() }],
        { transaction: t }
      );
    });
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      // Only remove the row this migration could have created. If the claim was
      // already present under a different id, leave it alone.
      await queryInterface.bulkDelete(
        { tableName: "Claims", schema: "security" },
        { id: { [Sequelize.Op.eq]: claim.id } },
        { transaction: t }
      );
    });
  },
};
