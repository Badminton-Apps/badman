'use strict';

module.exports = {
  up: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      // #region event
      await queryInterface.addConstraint(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        {
          fields: ['name', 'locationId'],
          type: 'unique',
          name: 'courts_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Events',
          schema: 'event'
        },
        {
          fields: ['name', 'firstDay'],
          type: 'unique',
          name: 'events_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        {
          fields: ['playerId', 'gameId'],
          type: 'unique',
          name: 'gamePlayers_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        {
          fields: ['name', 'eventId'],
          type: 'unique',
          name: 'locations_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        {
          fields: [
            'name',
            'eventType',
            'gameType',
            'drawType',
            'levelType',
            'EventId'
          ],
          type: 'unique',
          name: 'event_subEvents_unique_constraint',
          transaction: t
        }
      );
      // #endregion

      // #region import
      await queryInterface.addConstraint(
        {
          tableName: 'Files',
          schema: 'import'
        },
        {
          fields: ['name', 'type', 'firstDay'],
          type: 'unique',
          name: 'files_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        {
          fields: [
            'name',
            'eventType',
            'gameType',
            'drawType',
            'levelType',
            'FileId'
          ],
          type: 'unique',
          name: 'import_subEvents_unique_constraint',
          transaction: t
        }
      );
      // #endregion

      // #region ranking
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          fields: ['SubEventId', 'GroupId'],
          type: 'unique',
          name: 'unique_constraintgroupSubEvents_',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        {
          fields: ['SystemId', 'GroupId'],
          type: 'unique',
          name: 'unique_constraintgroupSystems_',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Groups',
          schema: 'ranking'
        },
        {
          fields: ['name'],
          type: 'unique',
          name: 'groups_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        {
          fields: ['PlayerId', 'GameId', 'SystemId'],
          type: 'unique',
          name: 'points_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        {
          fields: ['name'],
          type: 'unique',
          name: 'systems_unique_constraint',
          transaction: t
        }
      );
      // #endregion

      // #region public
      await queryInterface.addConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        {
          fields: ['playerId', 'clubId', 'start'],
          type: 'unique',
          name: 'clubMemberships_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        {
          fields: ['name'],
          type: 'unique',
          name: 'clubs_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        {
          fields: ['playerId', 'teamId', 'start'],
          type: 'unique',
          name: 'teamMemberships_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          fields: ['name', 'ClubId'],
          type: 'unique',
          name: 'teams_unique_constraint',
          transaction: t
        }
      );

      // #endregion
    });
  },

  down: async (queryInterface, sequelize) => {
    return queryInterface.sequelize.transaction(async t => {
      // #region event
      await queryInterface.removeConstraint(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'courts_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Events',
          schema: 'event'
        },
        'events_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        'gamePlayers_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Events',
          schema: 'event'
        },
        'events_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'locations_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'event_subEvents_unique_constraint',
        {
          transaction: t
        }
      );
      // #endregion

      // #region import
      await queryInterface.removeConstraint(
        {
          tableName: 'Files',
          schema: 'import'
        },
        'files_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'import_subEvents_unique_constraint',
        {
          transaction: t
        }
      );
      // #endregion

      // #region ranking
      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'groupSubEvents_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        'groupSystems_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Groups',
          schema: 'ranking'
        },
        'groups_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'points_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'systems_unique_constraint',
        {
          transaction: t
        }
      );
      // #endregion

      // #region public
      await queryInterface.removeConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'clubMemberships_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Clubs',
          schema: 'public'
        },

        'clubs_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },

        'teamMemberships_unique_constraint',
        {
          transaction: t
        }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'teams_unique_constraint',
        {
          transaction: t
        }
      );

      // #endregion
    });
  }
};
