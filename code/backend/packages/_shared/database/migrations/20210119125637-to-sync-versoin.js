'use strict';

// This is a big script just forcing the DB to the version that would be created via .sync({force: true})
// This is better not used, but leaving it here just in case :)

module.exports = {
  up: async (queryInterface, sequelize) => {
    const promise = queryInterface.sequelize.transaction(async t => {
      // #region Dropping all links to ID's
      await queryInterface.removeConstraint(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'Courts_locationId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        'GamePlayers_gameId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        'GamePlayers_playerId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'Games_courtId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'Games_subEventId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'Locations_eventId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'SubEvents_EventId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'SubEvents_FileId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'ClubMemberships_clubId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'ClubMemberships_playerId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'RequestLinks_PlayerId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'TeamMemberships_teamId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'TeamMemberships_playerId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'Teams_ClubId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'Teams_SubEventId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'GroupSubEvents_SubEventId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'GroupSubEvents_GroupId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        'GroupSystems_GroupId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        'GroupSystems_SystemId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'Places_PlayerId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'Places_SystemId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'Points_PlayerId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'Points_SystemId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'Points_GameId_fkey',
        { transaction: t }
      );
      await queryInterface.removeConstraint(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'Systems_runById_fkey',
        { transaction: t }
      );

      // #endregion

      // #region Switch PK's
      await queryInterface.changeColumn(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Events',
          schema: 'event'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );

      await queryInterface.changeColumn(
        {
          tableName: 'Files',
          schema: 'import'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );

      await queryInterface.addColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'active',
        {
          type: sequelize.DataTypes.BOOLEAN,
          defaultValue: true
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Clubs',
          schema: 'public'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Players',
          schema: 'public'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.addColumn(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );

      await queryInterface.changeColumn(
        {
          tableName: 'Groups',
          schema: 'ranking'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'id',
        {
          type: sequelize.DataTypes.STRING,
          defaultValue: sequelize.DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        { transaction: t }
      );
      // #endregion

      // #region change all FK's
      await queryInterface.changeColumn(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'locationId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        'gameId',
        { type: sequelize.DataTypes.STRING, allowNull: false },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        'playerId',
        { type: sequelize.DataTypes.STRING, allowNull: false },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'subEventId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Games',
          schema: 'event'
        },
        'courtId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        'eventId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        'EventId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        'FileId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'clubId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        'playerId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        'PlayerId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'teamId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        'playerId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'ClubId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        'SubEventId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'SubEventId',
        { type: sequelize.DataTypes.STRING, allowNull: false },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        'GroupId',
        { type: sequelize.DataTypes.STRING, allowNull: false },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        'GroupId',
        { type: sequelize.DataTypes.STRING, allowNull: false },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        'SystemId',
        { type: sequelize.DataTypes.STRING, allowNull: false },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'PlayerId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        'SystemId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'PlayerId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'SystemId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        'GameId',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'runById',
        { type: sequelize.DataTypes.STRING },
        { transaction: t }
      );

      // #endregion

      // #region Drop sequences (ids)
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS event."Courts_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS event."Events_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS event."Games_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS event."Locations_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS event."SubEvents_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS import."Files_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS import."SubEvents_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS public."Clubs_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS public."Players_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS public."RequestLinks_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS public."Teams_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS ranking."Groups_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS ranking."Places_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS ranking."Points_id_seq"',
        { transaction: t }
      );
      await queryInterface.sequelize.query(
        'DROP SEQUENCE IF EXISTS ranking."Systems_id_seq"',
        { transaction: t }
      );
      // #endregion

      // #region event
      await queryInterface.changeColumn(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'locationId',
        {
          type: sequelize.DataTypes.STRING
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'createdAt',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'updatedAt',
        {
          type: sequelize.DataTypes.DATE,
          allowNull: false
        },
        { transaction: t }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'locationId'],
          type: 'unique',
          name: 'Courts_name_locationId_key',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Events',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'firstDay'],
          type: 'unique',
          name: 'Events_name_firstDay_key',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['playerId', 'gameId'],
          type: 'primary key',
          name: 'GamePlayers_pkey',
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'eventId'],
          type: 'unique',
          name: 'Locations_name_eventId_key',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: [
            'name',
            'eventType',
            'gameType',
            'drawType',
            'levelType',
            'EventId',
            'internalId'
          ],
          type: 'unique',
          name: 'SubEvents_name_eventType_gameType_drawType_levelType_intern_key',
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
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'type', 'firstDay'],
          type: 'unique',
          name: 'Files_name_type_firstDay_key',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: [
            'name',
            'eventType',
            'gameType',
            'drawType',
            'levelType',
            'FileId',
            'internalId'
          ],
          type: 'unique',
          name: 'SubEvents_name_eventType_gameType_drawType_levelType_intern_key',
          transaction: t
        }
      );
      // #endregion

      // #region ranking
      await queryInterface.sequelize.query(
        'ALTER TYPE ranking."enum_Systems_intervalCalcUnit" RENAME TO "enum_Systems_periodUnit";',
        {
          transaction: t
        }
      );
      await queryInterface.sequelize.query(
        'ALTER TYPE ranking."enum_Systems_intervalUnit" RENAME TO "enum_Systems_updateIntervalUnit";',
        {
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['SubEventId', 'GroupId'],
          type: 'unique',
          name: 'groupSubEvents_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['SystemId', 'GroupId'],
          type: 'unique',
          name: 'groupSystems_unique_constraint',
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Groups',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
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
          onDelete: 'cascade',
          onUpdate: 'cascade',
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
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name'],
          type: 'unique',
          name: 'systems_unique_constraint',
          transaction: t
        }
      );
      // #endregion

      // #region public
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS public."enum_RankingTypes_intervalCalcUnit";',
        {
          transaction: t
        }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS public."enum_RankingTypes_intervalUnit";',
        {
          transaction: t
        }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS public."enum_RankingTypes_rankingSystem";',
        {
          transaction: t
        }
      );

      await queryInterface.changeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'runCurrently',
        {
          type: sequelize.DataTypes.BOOLEAN,
          defaultValue: false
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'differenceForUpgrade',
        {
          type: sequelize.DataTypes.INTEGER,
          defaultValue: 1
        },
        { transaction: t }
      );
      await queryInterface.changeColumn(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        'differenceForDowngrade',
        {
          type: sequelize.DataTypes.INTEGER,
          defaultValue: 0
        },
        { transaction: t }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
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
          onDelete: 'cascade',
          onUpdate: 'cascade',
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
          onDelete: 'cascade',
          onUpdate: 'cascade',
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
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['name', 'ClubId'],
          type: 'unique',
          name: 'teams_unique_constraint',
          transaction: t
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Players',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['firstName', 'lastName', 'memberId'],
          type: 'unique',
          name: 'Players_firstName_lastName_memberId_key',
          transaction: t
        }
      );

      // #endregion

      // #region Relinking all links to ID's
      await queryInterface.addConstraint(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['locationId'],
          type: 'foreign key',
          name: 'Courts_locationId_fkey',
          references: {
            table: {
              tableName: 'Locations',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['gameId'],
          type: 'foreign key',
          name: 'GamePlayers_gameId_fkey',
          references: {
            table: {
              tableName: 'Games',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GamePlayers',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['playerId'],
          type: 'foreign key',
          name: 'GamePlayers_playerId_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['subEventId'],
          type: 'foreign key',
          name: 'Games_subEventId_fkey',
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['courtId'],
          type: 'foreign key',
          name: 'Games_courtId_fkey',
          references: {
            table: {
              tableName: 'Courts',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Locations',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['eventId'],
          type: 'foreign key',
          name: 'Locations_eventId_fkey',
          references: {
            table: {
              tableName: 'Events',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'SubEvents',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['EventId'],
          type: 'foreign key',
          name: 'SubEvents_EventId_fkey',
          references: {
            table: {
              tableName: 'Events',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'SubEvents',
          schema: 'import'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['FileId'],
          type: 'foreign key',
          name: 'SubEvents_FileId_fkey',
          references: {
            table: {
              tableName: 'Files',
              schema: 'import'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['clubId'],
          type: 'foreign key',
          name: 'ClubMemberships_clubId_fkey',
          references: {
            table: {
              tableName: 'Clubs',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'ClubMemberships',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['playerId'],
          type: 'foreign key',
          name: 'ClubMemberships_playerId_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'RequestLinks',
          schema: 'public'
        },
        {
          onDelete: 'SET NULL',
          onUpdate: 'cascade',
          fields: ['PlayerId'],
          type: 'foreign key',
          name: 'RequestLinks_PlayerId_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['teamId'],
          type: 'foreign key',
          name: 'TeamMemberships_teamId_fkey',
          references: {
            table: {
              tableName: 'Teams',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'TeamMemberships',
          schema: 'public'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['playerId'],
          type: 'foreign key',
          name: 'TeamMemberships_playerId_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          onDelete: 'SET NULL',
          onUpdate: 'cascade',
          fields: ['ClubId'],
          type: 'foreign key',
          name: 'Teams_ClubId_fkey',
          references: {
            table: {
              tableName: 'Clubs',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Teams',
          schema: 'public'
        },
        {
          onDelete: 'SET NULL',
          onUpdate: 'cascade',
          fields: ['SubEventId'],
          type: 'foreign key',
          name: 'Teams_SubEventId_fkey',
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['SubEventId'],
          type: 'foreign key',
          name: 'GroupSubEvents_SubEventId_fkey',
          references: {
            table: {
              tableName: 'SubEvents',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSubEvents',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['GroupId'],
          type: 'foreign key',
          name: 'GroupSubEvents_GroupId_fkey',
          references: {
            table: {
              tableName: 'Groups',
              schema: 'ranking'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['GroupId'],
          type: 'foreign key',
          name: 'GroupSystems_GroupId_fkey',
          references: {
            table: {
              tableName: 'Groups',
              schema: 'ranking'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'GroupSystems',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['SystemId'],
          type: 'foreign key',
          name: 'GroupSystems_SystemId_fkey',
          references: {
            table: {
              tableName: 'Systems',
              schema: 'ranking'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['PlayerId'],
          type: 'foreign key',
          name: 'Places_PlayerId_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Places',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['SystemId'],
          type: 'foreign key',
          name: 'Places_SystemId_fkey',
          references: {
            table: {
              tableName: 'Systems',
              schema: 'ranking'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['PlayerId'],
          type: 'foreign key',
          name: 'Points_PlayerId_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['SystemId'],
          type: 'foreign key',
          name: 'Points_SystemId_fkey',
          references: {
            table: {
              tableName: 'Systems',
              schema: 'ranking'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Points',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['GameId'],
          type: 'foreign key',
          name: 'Points_GameId_fkey',
          references: {
            table: {
              tableName: 'Games',
              schema: 'event'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      await queryInterface.addConstraint(
        {
          tableName: 'Systems',
          schema: 'ranking'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['runById'],
          type: 'foreign key',
          name: 'Systems_runById_fkey',
          references: {
            table: {
              tableName: 'Players',
              schema: 'public'
            },
            field: 'id'
          },
          transaction: t
        }
      );
      // #endregion

      /// !! ----------------------- WARNING ----------------------- !!
      /// !! At this point I got bored, so generated a change script !!
      /// !! ------------------------------------------------------- !!

      // #region event
      await queryInterface.sequelize.query(
        `
        -- This script was generated by a beta version of the Schema Diff utility in pgAdmin 4. 
        -- This version does not include dependency resolution, and may require manual changes 
        -- to the script to ensure changes are applied in the correct order.
        -- Please report an issue for any failure with the reproduction steps. 
        BEGIN;

        ALTER TABLE event."Events"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE event."Events"
            ALTER COLUMN "updatedAt" SET NOT NULL;

        ALTER TABLE event."Games"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE event."Games"
            ALTER COLUMN "updatedAt" SET NOT NULL;

        ALTER TABLE event."Locations" DROP COLUMN address;

        ALTER TABLE event."Locations" DROP COLUMN city;

        ALTER TABLE event."Locations" DROP COLUMN fax;

        ALTER TABLE event."Locations" DROP COLUMN phone;

        ALTER TABLE event."Locations" DROP COLUMN postalcode;

        ALTER TABLE event."Locations" DROP COLUMN state;

        ALTER TABLE event."Locations"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE event."Locations"
            ALTER COLUMN "updatedAt" SET NOT NULL;

        ALTER TABLE event."SubEvents"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE event."SubEvents"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE event."SubEvents" DROP CONSTRAINT "SubEvents_name_eventType_gameType_drawType_levelType_intern_key";

        ALTER TABLE event."SubEvents"
            ADD CONSTRAINT "SubEvents_name_eventType_gameType_levelType_internalId_Even_key" UNIQUE (name, "eventType", "gameType", "levelType", "internalId", "EventId");
        CREATE INDEX sub_events_name
            ON event."SubEvents" USING btree
            (name COLLATE pg_catalog."default" ASC NULLS LAST)
            TABLESPACE pg_default;
        END;
        `,
        {
          transaction: t
        }
      );
      // #endregion

      // #region import
      await queryInterface.sequelize.query(
        `
        -- This script was generated by a beta version of the Schema Diff utility in pgAdmin 4. 
        -- This version does not include dependency resolution, and may require manual changes 
        -- to the script to ensure changes are applied in the correct order.
        -- Please report an issue for any failure with the reproduction steps. 
        BEGIN;
        ALTER TABLE import."Files"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE import."Files"
            ALTER COLUMN "updatedAt" SET NOT NULL;

        ALTER TABLE import."SubEvents"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE import."SubEvents"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE import."SubEvents" DROP CONSTRAINT "SubEvents_name_eventType_gameType_drawType_levelType_intern_key";

        ALTER TABLE import."SubEvents"
            ADD CONSTRAINT "SubEvents_name_eventType_gameType_levelType_internalId_File_key" UNIQUE (name, "eventType", "gameType", "levelType", "internalId", "FileId");

        END;
        `,
        {
          transaction: t
        }
      );
      // #endregion

      // #region public
      await queryInterface.sequelize.query(
        `-- This script was generated by a beta version of the Schema Diff utility in pgAdmin 4. 
        -- This version does not include dependency resolution, and may require manual changes 
        -- to the script to ensure changes are applied in the correct order.
        -- Please report an issue for any failure with the reproduction steps. 
        BEGIN;
        ALTER TABLE public."ClubMemberships"
            ALTER COLUMN "playerId" SET NOT NULL;
        
        ALTER TABLE public."ClubMemberships"
            ALTER COLUMN "clubId" SET NOT NULL;
        
        ALTER TABLE public."ClubMemberships"
            ALTER COLUMN start SET NOT NULL;
        
        ALTER TABLE public."ClubMemberships"
            ALTER COLUMN "createdAt" SET NOT NULL;
        
        ALTER TABLE public."ClubMemberships"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE public."ClubMemberships"
            ADD CONSTRAINT "ClubMemberships_pkey" PRIMARY KEY (id);
        
        ALTER TABLE public."ClubMemberships" DROP CONSTRAINT "clubMemberships_unique_constraint";
        
        ALTER TABLE public."ClubMemberships"
            ADD CONSTRAINT "ClubMemberships_playerId_clubId_start_key" UNIQUE ("playerId", "clubId", start);
        
        ALTER TABLE public."Clubs"
            ALTER COLUMN "createdAt" SET NOT NULL;
        
        ALTER TABLE public."Clubs"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE public."Clubs" DROP CONSTRAINT clubs_unique_constraint;
        
        ALTER TABLE public."Clubs"
            ADD CONSTRAINT "Clubs_name_key" UNIQUE (name);
        CREATE INDEX clubs_name
            ON public."Clubs" USING btree
            (name COLLATE pg_catalog."default" ASC NULLS LAST)
            TABLESPACE pg_default;
        
        ALTER TABLE public."Players"
            ALTER COLUMN "createdAt" SET NOT NULL;
        
        ALTER TABLE public."Players"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE public."Players" DROP CONSTRAINT "compositeIndex";
        CREATE INDEX players_last_name
            ON public."Players" USING btree
            ("lastName" COLLATE pg_catalog."default" ASC NULLS LAST)
            TABLESPACE pg_default;
        
        CREATE INDEX players_first_name
            ON public."Players" USING btree
            ("firstName" COLLATE pg_catalog."default" ASC NULLS LAST)
            TABLESPACE pg_default;
        
        CREATE INDEX players_member_id
            ON public."Players" USING btree
            ("memberId" COLLATE pg_catalog."default" ASC NULLS LAST)
            TABLESPACE pg_default;
        
        ALTER TABLE public."RequestLinks"
            ALTER COLUMN "createdAt" SET NOT NULL;
        
        ALTER TABLE public."RequestLinks"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        
        ALTER TABLE public."TeamMemberships"
            ALTER COLUMN "playerId" SET NOT NULL;
        
        ALTER TABLE public."TeamMemberships"
            ALTER COLUMN "teamId" SET NOT NULL;
        
        ALTER TABLE public."TeamMemberships"
            ALTER COLUMN start SET NOT NULL;
        
        ALTER TABLE public."TeamMemberships"
            ALTER COLUMN "createdAt" SET NOT NULL;
        
        ALTER TABLE public."TeamMemberships"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE public."TeamMemberships"
            ADD CONSTRAINT "TeamMemberships_pkey" PRIMARY KEY (id);
        
        ALTER TABLE public."TeamMemberships" DROP CONSTRAINT "teamMemberships_unique_constraint";
        
        ALTER TABLE public."TeamMemberships"
            ADD CONSTRAINT "TeamMemberships_playerId_teamId_start_key" UNIQUE ("playerId", "teamId", start);
        
        ALTER TABLE public."Teams"
            ALTER COLUMN "createdAt" SET NOT NULL;
        
        ALTER TABLE public."Teams"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE public."Teams" DROP CONSTRAINT teams_unique_constraint;
        
        ALTER TABLE public."Teams"
            ADD CONSTRAINT "Teams_name_ClubId_key" UNIQUE (name, "ClubId");
        
        END;`,
        {
          transaction: t
        }
      );
      // #endregion

      // #region ranking
      await queryInterface.sequelize.query(
        `
        -- This script was generated by a beta version of the Schema Diff utility in pgAdmin 4. 
        -- This version does not include dependency resolution, and may require manual changes 
        -- to the script to ensure changes are applied in the correct order.
        -- Please report an issue for any failure with the reproduction steps. 
        BEGIN;
        ALTER TABLE ranking."GroupSubEvents"
            ADD CONSTRAINT "GroupSubEvents_pkey" PRIMARY KEY ("SubEventId", "GroupId");

        ALTER TABLE ranking."GroupSubEvents" DROP CONSTRAINT "groupSubEvents_unique_constraint";

        ALTER TABLE ranking."GroupSystems"
            ADD CONSTRAINT "GroupSystems_pkey" PRIMARY KEY ("SystemId", "GroupId");

        ALTER TABLE ranking."GroupSystems" DROP CONSTRAINT "groupSystems_unique_constraint";

        ALTER TABLE ranking."Groups"
            ALTER COLUMN "createdAt" SET NOT NULL;


        ALTER TABLE ranking."Groups"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE ranking."Groups" DROP CONSTRAINT groups_unique_constraint;

        ALTER TABLE ranking."Groups"
            ADD CONSTRAINT "Groups_name_key" UNIQUE (name);

        ALTER TABLE ranking."Places"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE ranking."Places"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE ranking."Places" DROP CONSTRAINT "compositeIndex";

        ALTER TABLE ranking."Places"
            ADD CONSTRAINT "Places_rankingDate_PlayerId_SystemId_key" UNIQUE ("rankingDate", "PlayerId", "SystemId");

        ALTER TABLE ranking."Points"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE ranking."Points"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE ranking."Points" DROP CONSTRAINT points_unique_constraint;

        ALTER TABLE ranking."Systems"
            ALTER COLUMN "createdAt" SET NOT NULL;

        ALTER TABLE ranking."Systems"
            ALTER COLUMN "startingType" SET DEFAULT 'formula'::ranking."enum_Systems_startingType";

        ALTER TABLE ranking."Systems"
            ALTER COLUMN "updatedAt" SET NOT NULL;
        ALTER TABLE ranking."Systems" DROP CONSTRAINT systems_unique_constraint;

        ALTER TABLE ranking."Systems"
            ADD CONSTRAINT "Systems_name_key" UNIQUE (name);

        END;
        `,
        {
          transaction: t
        }
      );
      // #endregion
    });

    promise.catch(e => {
      // eslint-disable-next-line no-console
      console.error('migration failed', e);
    });

    return promise;
  },

  down: async (queryInterface, sequelize) => {
    throw new Error(
      'Only forward from here; feel free to add it yourself. TO much work for me'
    );

    return queryInterface.sequelize.transaction(async t => {
      // #region event
      await queryInterface.changeColumn(
        {
          tableName: 'Courts',
          schema: 'event'
        },
        'id',
        {
          type: sequelize.DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        }
      );

      await queryInterface.addConstraint(
        {
          tableName: 'Games',
          schema: 'event'
        },
        {
          onDelete: 'cascade',
          onUpdate: 'cascade',
          fields: ['courtId'],
          type: 'foreign key',
          name: 'Games_courtId_fkey',
          references: {
            table: {
              tableName: 'Courts',
              schema: 'event'
            },
            field: 'courtId'
          },
          transaction: t
        }
      );
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
      await queryInterface.sequelize.query(
        'ALTER TYPE ranking."enum_Systems_periodUnit" RENAME TO "enum_Systems_intervalCalcUnit";',
        {
          transaction: t
        }
      );
      await queryInterface.sequelize.query(
        'ALTER TYPE ranking."enum_Systems_updateIntervalUnit" RENAME TO "enum_Systems_intervalUnit";',
        {
          transaction: t
        }
      );
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
