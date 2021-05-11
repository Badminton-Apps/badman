import {
  Club,
  DataBaseHandler,
  EventCompetition,
  SubEventCompetition,
  SubEventType,
  Team,
  logger,
  Location,
  Player,
  LastRankingPlace
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';

import ADODB from 'node-adodb';
import moment from 'moment';
import { parseString } from '@fast-csv/parse';
import { readFile } from 'fs';

const YEAR = 2021;
const ROOT = `D:\\Programming\\Code\\Badminton-Vlaanderen\\files\\competition\\`;

(async () => {
  try {
    await updateCpFile(
      `${ROOT}\\${YEAR}-${YEAR + 1}\\pba_test.cp;`,
      'PBA competitie 2021-2022'
    );
  } catch (e) {
    logger.error('Something went wrong', e);
  }
})();

async function updateCpFile(fileLocation: string, name: string) {
  return new Promise(async (resolve, reject) => {
    readFile(
      `${ROOT}\\${YEAR}-${YEAR + 1}\\ledenlijst_5_05_2021.csv`,
      'utf8',
      (err, csv) => {
        const stream = parseString(csv, {
          headers: true,
          delimiter: ';',
          ignoreEmpty: true
        });
        const code_players: Map<string, string> = new Map();
        stream.on('data', row => {
          code_players.set(row.memberid, row.code);
        });
        stream.on('error', error => {
          logger.error(error);
        });
        stream.on('end', async rowCount => {
          const connection = ADODB.open(
            `Provider=Microsoft.Jet.OLEDB.4.0;Data Source=${fileLocation};Jet OLEDB:Database Password=${process.env.CP_PASS}`
          );

          new DataBaseHandler(dbConfig.default);

          const dbClubs = await Club.findAll({
            include: [
              {
                model: Team,
                required: true,
                where: {
                  active: true
                },
                include: [
                  {
                    model: SubEventCompetition,
                    required: true,
                    include: [
                      {
                        required: true,
                        model: EventCompetition,
                        attributes: [],
                        where: {
                          startYear: YEAR,
                          name
                        }
                      }
                    ]
                  },
                  {
                    model: Location
                  },
                  {
                    model: Player,
                    as: 'players',
                    include: [{ model: LastRankingPlace }],
                    through: {
                      where: { base: true }
                    }
                  },
                  {
                    model: Player,
                    as: 'captain'
                  }
                ]
              },
              {
                model: Location
              }
            ]
          });

          logger.info('Cleanup');
          await connection.execute('DELETE FROM stageentry');
          await connection.execute('DELETE FROM Entry');
          await connection.execute('DELETE FROM TeamPlayer');
          await connection.execute('DELETE FROM PlayerlevelEntry');
          await connection.execute('DELETE FROM Team');
          await connection.execute('DELETE FROM Court');
          await connection.execute('DELETE FROM Location');
          await connection.execute('DELETE FROM Player');
          await connection.execute('DELETE FROM Club');

          const clubs = new Map<number, Club>();
          const teams = new Map<number, Team>();
          const locations = new Map<string, number>();
          const players = new Map<string, number>();

          logger.info('Getting events, sages, ...');
          const events = (await connection.query(`SELECT * from Event`)) as {
            id: number;
            name: string;
            gender: number;
          }[];

          const stages = (await connection.query(
            `SELECT * from stage WHERE stagetype = 1`
          )) as {
            ID: number;
            name: string;
            event: number;
            stagetype: number;
          }[];

          const insertDate = moment().format('MM/DD/YYYY HH:MM:ss');

          logger.info('Inserting Club data');
          for (const club of dbClubs) {
            const internal = await addClubs(club);
            await addLocations(club, internal.id);
            await addTeams(club, internal.id);
          }

          await linkTeamsToEvents();

          resolve('Good to go');

          async function linkTeamsToEvents() {
            for (const [teamId, team] of teams) {
              if (team.subEvents.length > 1) {
                logger.warn('More events?');
              }
              if (team.subEvents.length == 0) {
                logger.warn('no events?');
              }

              let gender = 0;
              switch (team.type) {
                case SubEventType.M:
                  gender = 1;
                  break;
                case SubEventType.F:
                  gender = 2;
                  break;
                case SubEventType.MX:
                  gender = 3;
                  break;
              }

              const myEvent = events.find(
                r => r.name === team.subEvents[0].name && r.gender === gender
              );
              if (!myEvent) {
                throw new Error('No event found');
              }

              const entryRes = await connection.execute(
                `INSERT INTO Entry(event, team) VALUES ("${myEvent.id}", "${teamId}")`,
                `SELECT @@Identity AS id`
              );

              const myStage = stages.find(s => +s.event === +myEvent.id);

              if (!myStage) {
                throw new Error('No stage found');
              }

              const stageRes = await connection.execute(
                `INSERT INTO stageentry(entry, stage) VALUES (${entryRes[0].id}, ${myStage.ID})`,
                `SELECT @@Identity AS id`
              );

              logger.debug(
                `Added Entry team: ${teamId}, event: ${myEvent.id} (entryId: ${entryRes[0].id}, stageId: ${stageRes[0].id})`
              );
            }
          }

          async function addTeams(club: Club, internalClubId: number) {
            for (const team of club.teams) {
              const prefLoc1 = locations.get(team.locations[0]?.id) ?? 'NULL';
              const prefLoc2 = locations.get(team.locations[1]?.id) ?? 'NULL';
              const captain = team.captain ?? { phone: '', email: '' };
              const dayofweek = getDayOfWeek(team.preferredDay);
              const plantime = team.preferredTime
                ? `#${team.preferredTime}#`
                : 'NULL';

              const query = `INSERT INTO Team(name, club, country, entrydate, phone, email, dayofweek, plantime, preferredlocation1, preferredlocation2) VALUES (
        "${team.name}", ${internalClubId}, 19, #${insertDate}#, "${captain.phone}", "${captain.email}", ${dayofweek}, ${plantime}, ${prefLoc1}, ${prefLoc2}
      )`;
              const teamRes = await connection.execute(
                query,
                `SELECT @@Identity AS id`
              );

              logger.debug(`Added Team ${team.name} (id: ${teamRes[0].id})`);
              teams.set(teamRes[0].id, team);
              await addBasePlayers(team, teamRes[0].id, internalClubId);
            }
          }

          async function addBasePlayers(
            team: Team,
            interalTeamId: number,
            internalClubId: number
          ) {
            for (const player of team.players) {
              let playerId = players.get(player.memberId);
              if (!playerId) {
                const code = code_players.get(player.memberId) ?? '';
                const gender = getGender(player.gender);

                const query = `INSERT INTO Player(name, firstname, gender, memberid, club, foreignid) VALUES (
        "${player.lastName}", "${player.firstName}", ${gender}, ${player.memberId}, ${internalClubId}, "${code}")`;
                const playerRes = await connection.execute(
                  query,
                  `SELECT @@Identity AS id`
                );
                playerId = playerRes[0].id;
                players.set(player.memberId, playerId);
              }

              await connection.execute(
                `INSERT INTO TeamPlayer(team, player, status) VALUES (${interalTeamId}, ${playerId}, 1)`
              );
              await connection.execute(
                `INSERT INTO PlayerlevelEntry(leveltype, playerid, level1, level2, level3) VALUES (1, ${playerId}, ${player
                  .lastRankingPlace?.single ?? 12}, ${player.lastRankingPlace
                  ?.double ?? 12}, ${player.lastRankingPlace?.mix ?? 12})`
              );
              logger.debug(`Added Player ${player.fullName} (id: ${playerId})`);
            }
          }

          async function addClubs(club: Club) {
            const clubRes = await connection.execute(
              `INSERT INTO Club(name, clubId, country, abbreviation) VALUES ("${club.name}", "${club.clubId}", 19, "${club.abbreviation}")`,
              `SELECT @@Identity AS id`
            );
            const response = clubRes[0];

            logger.debug(`Added club ${club.name} (id: ${response.id})`);
            clubs.set(response.id, club);
            return response;
          }

          async function addLocations(club: Club, internalClubId: number) {
            for (const location of club.locations) {
              const query = `INSERT INTO Location(name, address, postalcode, city, phone, clubid) VALUES ("${location.name}", "${location.street} ${location.streetNumber}", "${location.postalcode}", "${location.city}", "${location.phone}", ${internalClubId} )`;
              const locationRes = await connection.execute(
                query,
                `SELECT @@Identity AS id`
              );

              logger.debug(
                `Added location ${location.name} (id: ${locationRes[0].id})`
              );
              locations.set(location.id, locationRes[0].id);
            }
          }

          function getDayOfWeek(day: string) {
            if (!day) {
              return 'NULL';
            }

            switch (day) {
              case 'monday':
                return 1;
              case 'tuesday':
                return 2;
              case 'wednesday':
                return 3;
              case 'thursday':
                return 4;
              case 'friday':
                return 5;
              case 'saturday':
                return 6;
              case 'sunday':
                return 7;
              default:
                logger.warn('no day?', day);
            }
          }
          function getGender(gender: string) {
            if (!gender) {
              return 'NULL';
            }

            switch (gender) {
              case 'M':
                return 1;
              case 'F':
                return 2;

              default:
                logger.warn('no gender?', gender);
            }
          }
        });
      }
    );
  });
}
