/* eslint-disable no-console */
'use strict';

module.exports = {
  up: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.addColumn('Events', 'fileName', {
        type: sequelize.DataTypes.STRING
      }),
      queryInterface.addColumn('Events', 'usedForRanking', {
        type: sequelize.DataTypes.BOOLEAN
      }),
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  },

  down: (queryInterface, sequelize) => {
    const promise = Promise.all([
      queryInterface.removeColumn('Events', 'fileName'),
      queryInterface.removeColumn('Events', 'usedForRanking'),
    ]);

    promise.catch(err => {
      console.error('Failed migration', err);
    });

    return promise;
  }
};
