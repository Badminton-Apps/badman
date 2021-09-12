'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.sequelize.query(
          `ALTER TYPE "ranking"."enum_Systems_rankingSystem" ADD VALUE 'VISUAL';`,
          { transaction: t }
        );
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.sequelize.query(
          `DELETE FROM pg_enum
          WHERE enumlabel = 'VISUAL'
          AND enumtypid = ( SELECT oid FROM pg_type WHERE typname = 'enum_Systems_rankingSystem');`,
          { transaction: t }
        );
      } catch (err) {
        console.error(err);
        throw err;
      }
    });
  }
};
