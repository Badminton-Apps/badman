"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log("Enabling unaccent extension for PostgreSQL");

        // Check if we're using PostgreSQL
        if (queryInterface.sequelize.getDialect() === "postgres") {
          // Enable the unaccent extension
          await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS "unaccent";', {
            transaction: t,
          });

          console.log("Unaccent extension enabled successfully");
        } else {
          console.log("Skipping unaccent extension - not using PostgreSQL");
        }
      } catch (err) {
        console.error("We errored with", err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        console.log("Disabling unaccent extension");

        // Check if we're using PostgreSQL
        if (queryInterface.sequelize.getDialect() === "postgres") {
          // Note: We generally don't drop extensions in down migrations
          // as they might be used by other parts of the application
          // await queryInterface.sequelize.query('DROP EXTENSION IF EXISTS "unaccent";', {
          //   transaction: t,
          // });

          console.log("Unaccent extension cleanup skipped (recommended for safety)");
        }
      } catch (err) {
        console.error("We errored with", err?.message ?? err);
        t.rollback();
      }
    });
  },
};
