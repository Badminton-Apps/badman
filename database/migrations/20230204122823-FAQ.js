'use strict';

const claims = [
  {
    id: 'c201ccc2-7d9c-4b7e-8e2d-123cd7697b50',
    name: 'edit:faq',
    description: 'Edits FAQ',
    category: 'faq',
    type: 'GLOBAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '1d053268-0e4d-48f3-b537-0711e76dcdd5',
    name: 'add:faq',
    description: 'Adds FAQ',
    category: 'faq',
    type: 'GLOBAL',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.createTable(
          {
            tableName: 'Faqs',
            schema: 'public',
          },
          {
            id: {
              allowNull: false,
              primaryKey: true,
              type: Sequelize.UUID,
              defaultValue: Sequelize.UUIDV4,
            },
            question: {
              type: Sequelize.TEXT,
            },
            answer: {
              type: Sequelize.TEXT,
            },

            createdAt: {
              allowNull: false,
              type: Sequelize.DATE,
            },
            updatedAt: {
              allowNull: false,
              type: Sequelize.DATE,
            },
          },
          {
            transaction: t,
          },
        );

        // Add 2 claims to the database
        await queryInterface.bulkInsert(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          claims,
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.dropTable(
          {
            tableName: 'Faqs',
            schema: 'public',
          },
          {
            transaction: t,
          },
        );

        // Remove 2 claims from the database
        await queryInterface.bulkDelete(
          {
            tableName: 'Claims',
            schema: 'security',
          },
          {
            id: {
              [Sequelize.Op.in]: claims.map((claim) => claim.id),
            },
          },
          {
            transaction: t,
          },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
