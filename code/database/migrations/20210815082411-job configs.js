'use strict';

const newAdminClaims = [
  [
    'b7a8b933-095e-41ef-8ad1-b81316369bf4',
    'change:job',
    'Start stop jobs',
    'job'
  ]
];

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.createSchema('job', { transaction: t }),
          await queryInterface.createTable(
            {
              tableName: 'Crons',
              schema: 'job'
            },
            {
              id: {
                type: sequelize.DataTypes.STRING,
                primaryKey: true
              },
              cron: sequelize.DataTypes.STRING,
              type: sequelize.DataTypes.STRING,
              running: sequelize.DataTypes.BOOLEAN,
              lastRun: sequelize.DataTypes.DATE,
              meta: sequelize.DataTypes.JSON,
              createdAt: sequelize.DataTypes.DATE,
              updatedAt: sequelize.DataTypes.DATE
            },
            { transaction: t }
          );

        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          { id: '6b9e9b70-82b4-49f1-95ca-a170ab0df6fa' },
          { transaction: t }
        );

        await queryInterface.bulkUpdate(
          { tableName: 'Claims', schema: 'security' },
          {
            category: 'club'
          },
          {
            category: 'clubs'
          },
          {
            transaction: t
          }
        );

        await queryInterface.bulkInsert(
          { tableName: 'Claims', schema: 'security' },
          newAdminClaims.map(claimName => {
            return {
              id: claimName[0],
              name: claimName[1],
              description: claimName[2],
              category: claimName[3],
              updatedAt: new Date(),
              createdAt: new Date(),
              type: 'global'
            };
          }),
          {
            transaction: t,
            ignoreDuplicates: true,
            returning: ['id']
          }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      try {
        await queryInterface.dropSchema('job', { transaction: t });

        await queryInterface.bulkDelete(
          { tableName: 'Claims', schema: 'security' },
          { id: { [Op.in]: newAdminClaims.map(claimName => claimName[0]) } },
          { transaction: t }
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  }
};
