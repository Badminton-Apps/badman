/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.addColumn(
          {
            tableName: 'RankingSystems',
            schema: 'ranking',
          },
          'inactiveBehavior',
          {
            type: sequelize.DataTypes.ENUM('freeze', 'decrease'),
            allowNull: true,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err?.message ?? err);
        t.rollback();
      }
    });
  },

  down: async (queryInterface) => {
    return queryInterface.sequelize.transaction(async (t) => {
      try {
        await queryInterface.removeColumn(
          {
            tableName: 'RankingSystems',
            schema: 'ranking',
          },
          'inactiveBehavior',
          { transaction: t },
        );
      } catch (err) {
        console.error('We errored with', err);
        t.rollback();
      }
    });
  },
};
