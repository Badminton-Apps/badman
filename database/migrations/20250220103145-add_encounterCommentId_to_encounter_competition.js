'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addConstraint(
        { tableName: 'Comments', schema: 'public' },
        {
          fields: ['encounterId'],
          type: 'foreign key',
          references: {
            table: {tableName: 'EncounterCompetitions', schema: 'event'},
            field: 'id',
          },
          onDelete: 'cascade',
          onUpdate: 'cascade',
          name: 'Comments_encounterId_fkey',
          
        },
        {transaction: t}
      );
      return t.commit();
    } catch (error) {
      console.log('error', error)
      await t.rollback();
      throw error;
    }
  },

  async down (queryInterface, Sequelize) {
    const t = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeConstraint(
        { tableName: 'Comments', schema: 'public' },
        'Comments_encounterId_fkey',
        { transaction: t },
      );
      return t.commit();
    } catch (error) {
      await t.rollback();
      throw error;
    }
  },
};
