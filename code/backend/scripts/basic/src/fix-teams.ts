import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Op } from 'sequelize';
import {
  Club,
  DataBaseHandler,
  EncounterCompetition,
  logger,
  Team,
  SubEventType,
  TeamLocationCompetition,
  TeamPlayerMembership,
  TeamSubEventMembership,
  TeamSubEventMembershipBadmintonBvlMembershipMeta
} from '../../../packages/_shared';

(async () => {
  new DataBaseHandler({
    ...dbConfig.default
    // logging: (...msg) => logger.debug('Query', msg)
  });

  const transaction = await DataBaseHandler.sequelizeInstance.transaction();

  // Fix teams that need some updates
  await fixTeams();

  try {
    const clubs = await Club.findAll({
      transaction,
      include: [{ model: Team }]
    });

    // combine teams with same name
    for (const club of clubs) {
      const destroyed = [];
      for (const team of club.teams) {
        if (destroyed.includes(team.id)) {
          continue;
        }

        const sameNameTeams = club.teams.filter(
          r =>
            r.name.trim() == team.name.trim() ||
            (r.type == team.type && r.teamNumber == team.teamNumber)
        );

        var active = sameNameTeams.filter(t => t.active)[0];

        // Prefer active team, if no active team found, use first team
        if (active == null) {
          active = sameNameTeams[0];
        }

        if (sameNameTeams.length > 1) {
          const otherTeams = sameNameTeams.filter(t => t.id != active.id);
          await mergeTeams(active, otherTeams);
          destroyed.push(...otherTeams.map(t => t.id));
        }

        if (!destroyed.includes(team.id)) {
          team.name = team.name.trim();
          await Team.generateAbbreviation(team, { transaction });
          await team.save({ transaction });
        }
      }
    }

    await transaction.commit();
  } catch (error) {
    logger.debug('something went wrong', error);
    transaction.rollback();
  }


  async function mergeTeams(active: Team, otherTeams: Team[]) {
    await EncounterCompetition.update(
      { homeTeamId: active.id },
      {
        where: {
          homeTeamId: { [Op.in]: otherTeams.map(t => t.id) }
        },
        returning: false,
        transaction
      }
    );
    await EncounterCompetition.update(
      { awayTeamId: active.id },
      {
        where: {
          awayTeamId: { [Op.in]: otherTeams.map(t => t.id) }
        },
        returning: false,
        transaction
      }
    );
    await TeamLocationCompetition.update(
      { teamId: active.id },
      {
        where: {
          teamId: { [Op.in]: otherTeams.map(t => t.id) }
        },
        returning: false,
        transaction
      }
    );
    await TeamSubEventMembership.destroy({
      where: {
        teamId: { [Op.in]: otherTeams.map(t => t.id) }
      },
      transaction
    });
    await Team.destroy({
      where: { id: { [Op.in]: otherTeams.map(t => t.id) } },
      transaction
    });
    await TeamPlayerMembership.destroy({
      where: {
        teamId: { [Op.in]: otherTeams.map(t => t.id) }
      },
      transaction
    });
  }

  async function fixTeams() {
    // Gidse
    await Team.update(
      { teamNumber: 1 },
      { where: { id: 'fda7f9fb-52df-4e53-9448-bf83e193fd4d' }, transaction }
    );

    await Team.update(
      { active: true },
      { where: { id: '3dd263d1-d989-4fa1-ba9d-45eb99be8104' }, transaction }
    );

    // Create new Clubs
    await new Club({
      id: '9fc46f1a-6cfc-4b40-a266-f88ea09dc34e',
      name: 'Bad79',
      abbreviation: 'Bad79',
      clubId: 39
    }).save({ transaction });

    await new Club({
      id: '2b3628e2-4154-428c-8221-801bafeffaa5',
      name: 'BC Nivellois',
      abbreviation: 'Nivellois',
      clubId: 15
    }).save({ transaction });

    await new Club({
      id: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
      name: 'Grâce BC asbl',
      abbreviation: 'Grâce',
      clubId: 15
    }).save({ transaction });

    await new Club({
      id: 'afbb85f2-9144-4357-8c7c-fb23346fc2e4',
      name: 'Royal Badminton Club Verviers',
      abbreviation: 'Verviers',
      clubId: 19
    }).save({ transaction });

    // LIGA teams

    // Antwerp
    logger.debug('Fixing Antwerp');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: 'b101ed54-8961-42ec-a67a-690b179d13c7',
        active: true
      },
      { where: { id: 'bdd4ad24-73e3-4bf2-8d6b-2a3c1e7cea24' }, transaction }
    );
    await Team.update(
      { clubId: 'b101ed54-8961-42ec-a67a-690b179d13c7', teamNumber: 100 },
      { where: { id: '5a3e0cb0-dc56-476b-b836-7495733dac5c' }, transaction }
    );

    // Bad79
    logger.debug('Fixing Bad79');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '9fc46f1a-6cfc-4b40-a266-f88ea09dc34e',
        active: true
      },
      { where: { id: 'efad8ea1-0249-47d1-8e65-120261480ca1' }, transaction }
    );
    await Team.update(
      { clubId: '9fc46f1a-6cfc-4b40-a266-f88ea09dc34e', teamNumber: 100 },
      { where: { id: 'c917b2ec-7dce-4229-927e-4b6b0e10b09a' }, transaction }
    );
    await Team.update(
      { clubId: '9fc46f1a-6cfc-4b40-a266-f88ea09dc34e', teamNumber: 101 },
      { where: { id: '95904b82-c3c2-4cdb-80d4-c228dc9193bd' }, transaction }
    );

    // Brasschaat
    logger.debug('Fixing Brasschaat');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: 'b5c22c05-34a5-4243-9c46-273f27f75178',
        active: true
      },
      { where: { id: 'd024c827-44a3-4ee2-81f0-27abc5989b7c' }, transaction }
    );
    await Team.update(
      { clubId: 'b5c22c05-34a5-4243-9c46-273f27f75178', teamNumber: 100 },
      { where: { id: '182c5fe8-a415-4715-92da-2bfbda3a046f' }, transaction }
    );

    // Dijlevallei
    logger.debug('Fixing Dijlevallei');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: 'd962d499-1209-4489-b455-c10974abd644',
        active: true
      },
      { where: { id: '18264d7e-fae0-450d-a4ae-7f7b5254d88e' }, transaction }
    );
    await Team.update(
      { clubId: 'd962d499-1209-4489-b455-c10974abd644', teamNumber: 100 },
      { where: { id: 'ca33cda5-8a86-46c3-9bd3-141acc226076' }, transaction }
    );

    // DZ 99
    logger.debug('Fixing DZ99');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '06b4f094-a89a-4a32-829b-5687f942ee61',
        active: true
      },
      { where: { id: 'ec327571-969b-402f-9a3e-f3a29b56254b' }, transaction }
    );
    await Team.update(
      { clubId: '06b4f094-a89a-4a32-829b-5687f942ee61', teamNumber: 100 },
      { where: { id: '0e41e332-a8f3-457f-abc6-70097b621952' }, transaction }
    );
    await Team.update(
      {
        clubId: '06b4f094-a89a-4a32-829b-5687f942ee61',
        teamNumber: 101,
        name: 'DZ 99 1'
      },
      { where: { id: '5d1cf0e5-f470-4992-bb9d-cb5e60290086' }, transaction }
    );
    await Team.update(
      {
        clubId: '06b4f094-a89a-4a32-829b-5687f942ee61',
        teamNumber: 102,
        name: 'DZ 99 1'
      },
      { where: { id: '7f9011c7-ef8d-492b-82e5-ba3a2111adcb' }, transaction }
    );
    await Team.update(
      {
        clubId: '06b4f094-a89a-4a32-829b-5687f942ee61',
        teamNumber: 103,
        name: 'DZ 99 1'
      },
      { where: { id: '912826b2-ad74-4902-a306-cc126dcdfae6' }, transaction }
    );

    // Grace
    logger.debug('Fixing Grace');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        active: true
      },
      { where: { id: 'e39a73da-460b-44ad-8c30-78bb574f39b4' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 100,
        name: 'Grâce 1'
      },
      { where: { id: 'c0885840-3bf6-4d89-8e2c-e184f07c13c9' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 101,
        name: 'Grâce 1'
      },
      { where: { id: '75968477-82ba-442d-92f8-a1624e863a62' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 102,
        name: 'Grâce 1'
      },
      { where: { id: 'd340e639-917a-4b76-847c-458237519212' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 103,
        name: 'Grâce 1'
      },
      { where: { id: '3a857e89-8903-418c-adcc-97117092512d' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 104,
        name: 'Grâce 1'
      },
      { where: { id: '0d70d5b0-278d-4452-a33f-6c1c3ae12832' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 105,
        name: 'Grâce 1'
      },
      { where: { id: 'a8ad2e45-3c5b-49f3-a540-d5081a6146f4' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 106,
        name: 'Grâce 1'
      },
      { where: { id: '230f712a-17c6-4b29-b8ec-3e389a1f0b1d' }, transaction }
    );
    await Team.update(
      {
        clubId: '9c62b2b6-507e-4428-8579-8a280dfaa19e',
        teamNumber: 107,
        name: 'Grâce 1'
      },
      { where: { id: 'cb4d6a0c-0833-4ac5-adef-c437f5c81157' }, transaction }
    );

    // Hebad
    logger.debug('Fixing Hebad');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '3fd34c79-c4bd-40f6-90fa-58e7ee121058',
        active: true
      },
      { where: { id: 'e7c2b2f2-11f8-418b-a212-e96581c971de' }, transaction }
    );
    await Team.update(
      { clubId: '3fd34c79-c4bd-40f6-90fa-58e7ee121058', teamNumber: 100 },
      { where: { id: '89f6cb06-d491-401e-a6fa-f04e938f2b8c' }, transaction }
    );

    await Team.update(
      {
        teamNumber: 2,
        type: SubEventType.NATIONAL,
        clubId: '3fd34c79-c4bd-40f6-90fa-58e7ee121058',
        active: true
      },
      { where: { id: '0bce42d2-a314-4e86-b0f8-45578752e5a0' }, transaction }
    );
    await Team.update(
      { clubId: '3fd34c79-c4bd-40f6-90fa-58e7ee121058', teamNumber: 101 },
      { where: { id: 'e7901eec-7378-42e4-b75c-2c35b5665f75' }, transaction }
    );

    // Lebad
    logger.debug('Fixing Lebad');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5',
        active: true
      },
      { where: { id: '7f637c63-1b70-464f-a339-64fa74fe8b34' }, transaction }
    );
    await Team.update(
      { clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5', teamNumber: 100 },
      { where: { id: 'a655a31e-79ee-4584-af5b-c9ff1e7ef78e' }, transaction }
    );

    await Team.update(
      {
        clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5',
        teamNumber: 101,
        name: 'Lebad 1'
      },
      { where: { id: 'dd7b21cf-e721-4679-be49-c42f88a044ee' }, transaction }
    );

    await Team.update(
      {
        clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5',
        teamNumber: 102,
        name: 'Lebad 1'
      },
      { where: { id: 'b1d92cb5-e699-4989-9b3d-9f14be7e4362' }, transaction }
    );

    await Team.update(
      {
        clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5',
        teamNumber: 103,
        name: 'Lebad 1'
      },
      { where: { id: 'ddb1116e-f8a3-483a-addb-2eaebfce3b89' }, transaction }
    );

    await Team.update(
      {
        clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5',
        teamNumber: 104,
        name: 'Lebad 1'
      },
      { where: { id: '211f3522-b94b-4475-b7cd-838464cec781' }, transaction }
    );

    await Team.update(
      {
        clubId: '957ef8bb-1e66-4bbb-92af-0280d0cbbbf5',
        teamNumber: 105,
        name: 'Lebad 1'
      },
      { where: { id: '95076a5b-e9b4-46d3-aeb1-0c97383b67f9' }, transaction }
    );

    // Lokerse
    logger.debug('Fixing Lokerse');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '43285114-5b75-4bcf-9db3-41a9c9fb4205',
        active: true
      },
      { where: { id: 'b9f3df6f-53fc-459e-9dca-de632a7943c6' }, transaction }
    );
    await Team.update(
      { clubId: '43285114-5b75-4bcf-9db3-41a9c9fb4205', teamNumber: 100 },
      { where: { id: '153ca17f-09dc-417a-86e4-6b34b3090b13' }, transaction }
    );

    // Nivellois
    logger.debug('Fixing Nivellois');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '2b3628e2-4154-428c-8221-801bafeffaa5',
        active: true
      },
      { where: { id: '3c3fd599-1042-4952-9e93-d9523a2e378a' }, transaction }
    );
    await Team.update(
      { clubId: '2b3628e2-4154-428c-8221-801bafeffaa5', teamNumber: 100 },
      { where: { id: '224a9a7b-faae-4dee-8c81-22d8e239fa14' }, transaction }
    );

    // Olve
    logger.debug('Fixing Olve');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        active: true
      },
      { where: { id: '41963cd0-c85b-4530-be88-6e24b228e7e7' }, transaction }
    );
    await Team.update(
      { clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3', teamNumber: 100 },
      { where: { id: 'f3603fe3-ee5c-4878-aec5-551d952bac5f' }, transaction }
    );

    await Team.update(
      {
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        teamNumber: 101,
        name: 'Olve 1'
      },
      { where: { id: '17e46fd9-535b-433c-91e8-21e2a98e2c6f' }, transaction }
    );

    await Team.update(
      {
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        teamNumber: 102,
        name: 'Olve 1'
      },
      { where: { id: '68d4c674-0292-4e1d-84e7-e641a02a788d' }, transaction }
    );

    await Team.update(
      {
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        teamNumber: 103,
        name: 'Olve 1'
      },
      { where: { id: '6c0f7e0a-5791-4168-a7ff-ed6943140b83' }, transaction }
    );

    await Team.update(
      {
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        teamNumber: 104,
        name: 'Olve 1'
      },
      { where: { id: '7518ed54-e9f0-4129-8711-4ed0109aedf3' }, transaction }
    );

    await Team.update(
      {
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        teamNumber: 105,
        name: 'Olve 1'
      },
      { where: { id: 'f04663e7-00aa-4d80-877d-667f17f67d52' }, transaction }
    );

    await Team.update(
      {
        clubId: '696fe2ff-dcad-47a0-bf8b-d41c40f77db3',
        teamNumber: 106,
        name: 'Olve 1'
      },
      { where: { id: '846ae528-51a5-4610-9b6f-856a51e6b3a4' }, transaction }
    );

    // Pluimplukkers
    logger.debug('Fixing Pluimplukkers');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        active: true
      },
      { where: { id: 'c456a7a8-b6c9-4554-9eff-38dad9ac4839' }, transaction }
    );

    await Team.update(
      {
        teamNumber: 2,
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        type: SubEventType.NATIONAL
      },
      { where: { id: '086c615b-4a92-4a3b-a147-8742ae3fed78' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 100
      },
      { where: { id: '41497214-befb-4678-959e-65c9a2addbcc' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 101
      },
      { where: { id: '77320884-b524-4f29-958a-7348944ab4d0' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 102
      },
      { where: { id: '5f92b0d5-914f-4c76-9201-3dd619b94ede' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 103
      },
      { where: { id: '88e47daf-4571-4aea-bdea-a1706788c435' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 104
      },
      { where: { id: 'bc3c63be-65fb-4ec8-ad08-b8ff21d7e60f' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 105
      },
      { where: { id: '3e7ef659-2bf4-4073-baff-4103f58fafc4' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 106
      },
      { where: { id: '133cda67-c68b-4548-9731-61570c266912' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 107
      },
      { where: { id: '58ae05f8-74a9-4e90-a11e-055324d6e4b5' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 108
      },
      { where: { id: '0f95bf80-9901-48a6-9f0d-84b198323d11' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 109
      },
      { where: { id: '2104c112-1be7-4a0a-8dda-dd834a9f0970' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 110
      },
      { where: { id: '0aa52309-d46d-4365-9713-273153a36f0e' }, transaction }
    );

    await Team.update(
      {
        clubId: 'd7c8dc89-170e-4d26-9fe7-de7466724d25',
        name: 'Pluimplukkers 1',
        teamNumber: 111
      },
      { where: { id: '80c7733b-12ef-4db1-a840-1739c1b40054' }, transaction }
    );

    // Verviers
    logger.debug('Fixing Verviers');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: 'afbb85f2-9144-4357-8c7c-fb23346fc2e4',
        active: true
      },
      { where: { id: '01eacc18-5f69-482e-b0a5-883a2b112e71' }, transaction }
    );
    await Team.update(
      { clubId: 'afbb85f2-9144-4357-8c7c-fb23346fc2e4', teamNumber: 100 },
      { where: { id: '13cbc128-d49f-4927-b5c3-07a3ca99dc64' }, transaction }
    );
    await Team.update(
      {
        clubId: 'afbb85f2-9144-4357-8c7c-fb23346fc2e4',
        teamNumber: 101,
        name: 'Verviers 1'
      },
      { where: { id: '29f43cef-ad4d-4a76-be63-05815155c9c4' }, transaction }
    );
    await Team.update(
      {
        clubId: 'afbb85f2-9144-4357-8c7c-fb23346fc2e4',
        teamNumber: 102,
        name: 'Verviers 1'
      },
      { where: { id: '72ebf81c-76d9-4714-8b77-edad6a446ddc' }, transaction }
    );

    // W&L
    logger.debug('Fixing W&L');
    await Team.update(
      {
        teamNumber: 1,
        type: SubEventType.NATIONAL,
        clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8',
        name: 'W&L 1',
        active: true
      },
      { where: { id: 'e56b9a5e-0b32-40a6-bb28-b6288d50a30f' }, transaction }
    );

    await Team.update(
      {
        teamNumber: 2,
        type: SubEventType.NATIONAL,
        clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8',
        name: 'W&L 2',
        active: false
      },
      { where: { id: '92f71f15-97de-4eb5-8460-8603ebdcb1c7' }, transaction }
    );

    // W&L 1
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 100 },
      { where: { id: 'd716430d-d685-4217-9fe0-237acfbc7c06' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 101 },
      { where: { id: '6976b06a-12d3-476e-be1e-de14796c3a0d' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 102 },
      { where: { id: '5478a00e-246d-40f7-98e0-59288ee481d1' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 103 },
      { where: { id: 'f66eb395-b2b2-4113-a910-a5d467c12c58' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 104 },
      { where: { id: '849a618b-ce22-46c1-bcc8-e02adf234a3a' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 105 },
      { where: { id: '25061468-7fd0-42b7-b18c-0dec5da87a8e' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 106 },
      { where: { id: 'a96ce40c-ed02-4c4f-a06e-ddc3200216d8' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 107 },
      { where: { id: '0438cbe2-b4c4-45cd-9abc-5a21d87b9058' }, transaction }
    );

    // W&L 2
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 108 },
      { where: { id: 'bf3e13b8-883b-43cf-bf4e-6df367dac25f' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 109 },
      { where: { id: 'ca0ecf9e-af12-4c4e-97b6-ed3d6a2b5a8b' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 110 },
      { where: { id: '97ec3946-36d9-4ce3-862f-c930f3f4fc76' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 111 },
      { where: { id: '0d435dd5-50ce-4654-9deb-80085028dd3c' }, transaction }
    );
    await Team.update(
      { clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8', teamNumber: 112 },
      { where: { id: 'dcf16421-891e-4ebc-8553-e1b56f6302a6' }, transaction }
    );
    await Team.update(
      {
        clubId: '42fae3ce-fedf-42a2-8be7-bac533e9fec8',
        teamNumber: 113,
        type: SubEventType.NATIONAL
      },
      { where: { id: '655bdc8d-942f-4e42-8cbe-793a5d60ddf9' }, transaction }
    );

    // Division 1
    const membership0 = new TeamSubEventMembership({
      teamId: 'ec327571-969b-402f-9a3e-f3a29b56254b',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership0.meta = {
      teamIndex: 0,
      players: []
    };
    await membership0.save({ transaction });

    const membership1 = new TeamSubEventMembership({
      teamId: 'e56b9a5e-0b32-40a6-bb28-b6288d50a30f',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership1.meta = {
      teamIndex: 0,
      players: []
    };
    await membership1.save({ transaction });

    const membership2 = new TeamSubEventMembership({
      teamId: 'e7c2b2f2-11f8-418b-a212-e96581c971de',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership2.meta = {
      teamIndex: 0,
      players: []
    };
    await membership2.save({ transaction });

    const membership3 = new TeamSubEventMembership({
      teamId: '7f637c63-1b70-464f-a339-64fa74fe8b34',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership3.meta = {
      teamIndex: 0,
      players: []
    };
    await membership3.save({ transaction });

    const membership4 = new TeamSubEventMembership({
      teamId: 'c456a7a8-b6c9-4554-9eff-38dad9ac4839',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership4.meta = {
      teamIndex: 0,
      players: []
    };
    await membership4.save({ transaction });

    const membership5 = new TeamSubEventMembership({
      teamId: 'b9f3df6f-53fc-459e-9dca-de632a7943c6',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership5.meta = {
      teamIndex: 0,
      players: []
    };
    await membership5.save({ transaction });

    const membership6 = new TeamSubEventMembership({
      teamId: 'efad8ea1-0249-47d1-8e65-120261480ca1',
      subEventId: 'c52d1504-6a6b-42cb-85b6-a674fa9fdcb0'
    });
    membership6.meta = {
      teamIndex: 0,
      players: []
    };
    await membership6.save({ transaction });

    // Division 2
    // Verviers
    const membership7 = new TeamSubEventMembership({
      teamId: '01eacc18-5f69-482e-b0a5-883a2b112e71',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership7.meta = {
      teamIndex: 0,
      players: []
    };
    await membership7.save({ transaction });

    // Dijevallei
    const membership8 = new TeamSubEventMembership({
      teamId: '18264d7e-fae0-450d-a4ae-7f7b5254d88e',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership8.meta = {
      teamIndex: 0,
      players: []
    };
    await membership8.save({ transaction });

    // Grace
    const membership9 = new TeamSubEventMembership({
      teamId: 'e39a73da-460b-44ad-8c30-78bb574f39b4',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership9.meta = {
      teamIndex: 0,
      players: []
    };
    await membership9.save({ transaction });

    // Antwerp
    const membership10 = new TeamSubEventMembership({
      teamId: 'bdd4ad24-73e3-4bf2-8d6b-2a3c1e7cea24',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership10.meta = {
      teamIndex: 0,
      players: []
    };
    await membership10.save({ transaction });

    // Hebvad
    const membership11 = new TeamSubEventMembership({
      teamId: '0bce42d2-a314-4e86-b0f8-45578752e5a0',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership11.meta = {
      teamIndex: 0,
      players: []
    };
    await membership11.save({ transaction });

    // Olve
    const membership12 = new TeamSubEventMembership({
      teamId: '41963cd0-c85b-4530-be88-6e24b228e7e7',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership12.meta = {
      teamIndex: 0,
      players: []
    };
    await membership12.save({ transaction });

    // Nivelles
    const membership13 = new TeamSubEventMembership({
      teamId: '3c3fd599-1042-4952-9e93-d9523a2e378a',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership13.meta = {
      teamIndex: 0,
      players: []
    };
    await membership13.save({ transaction });

    // Nivelles
    const membership14 = new TeamSubEventMembership({
      teamId: 'd024c827-44a3-4ee2-81f0-27abc5989b7c',
      subEventId: '7d90d842-21ee-4a55-ba9d-2836054bca7a'
    });
    membership14.meta = {
      teamIndex: 0,
      players: []
    };
    await membership14.save({ transaction });
  }
})();
