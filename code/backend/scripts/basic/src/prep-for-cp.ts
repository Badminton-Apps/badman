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
  LastRankingPlace,
  Comment
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';

import ADODB from 'node-adodb';
import moment from 'moment';
import { parseString } from '@fast-csv/parse';
import { readFile } from 'fs';
import { copyFile, unlink } from 'fs/promises';
import { Op } from 'sequelize';

interface csvPlayer {
  code: string;
  dob: string;
  phone: string;
  email: string;
  TypeName: string;
  PlayerLevelSingle: string;
  PlayerLevelDouble: string;
  PlayerLevelMixed: string;
}

const YEAR = 2021;
const ROOT = `D:\\Programming\\Code\\Badminton-Vlaanderen\\files\\competition\\`;

const provs: { file: string; event: string }[] = [
  { file: 'PBA competitie 2021-2022', event: 'PBA competitie 2021-2022' },
  {
    file: 'VVBBC interclubcompetitie 2021-2022',
    event: 'VVBBC interclubcompetitie 2021-2022'
  },
  { file: 'PBO competitie 2021-2022', event: 'PBO competitie 2021-2022' },
  {
    file: 'Limburgse interclubcompetitie 2021-2022',
    event: 'Limburgse interclubcompetitie 2021-2022'
  },
  { file: 'WVBF Competitie 2021-2022', event: 'WVBF Competitie 2021-2022' },
  {
    file: 'Vlaamse interclubcompetitie 2021-2022',
    event: 'Vlaamse interclubcompetitie 2021-2022'
  }
];

(async () => {
  try {
    const players = await readCsvPlayers();
    const promsisse = provs
      // .filter(r => r.event == 'Limburgse interclubcompetitie 2021-2022')
      .map(prov => processProv(prov, players));
    await Promise.all(promsisse);
  } catch (e) {
    logger.error('Something went wrong', e);
  }
})();

async function processProv(
  prov: { file: string; event: string },
  players: Map<string, csvPlayer>
) {
  logger.info(`[${prov.file}] Started`);
  const original = `${ROOT}\\${YEAR}-${YEAR + 1}\\${prov.file}.cp`;
  const destination = `${ROOT}\\${YEAR}-${YEAR + 1}\\${prov.file}_filled.cp`;

  try {
    await unlink(destination);
  } catch (e) {}

  await copyFile(original, destination);
  await updateCpFile(destination, prov.event, players);

  logger.info(`[${prov.file}] Finished`);
}

async function readCsvPlayers() {
  return new Promise<Map<string, csvPlayer>>(async (resolve, reject) => {
    readFile(
      `${ROOT}\\${YEAR}-${YEAR + 1}\\ledenlijst_5_20_2021.csv`,
      'utf8',
      (err, csv) => {
        const stream = parseString(csv, {
          headers: true,
          delimiter: ';',
          ignoreEmpty: true
        });
        const code_players: Map<string, csvPlayer> = new Map();
        stream.on('data', row => {
          if (code_players.get(row.memberid) != null) {
            logger.warn('Player exists twice?', row.memberid);
          }

          code_players.set(row.memberid, row);
        });
        stream.on('error', error => {
          logger.error(error);
        });
        stream.on('end', async rowCount => {
          resolve(code_players);
        });
      }
    );
  });
}

async function updateCpFile(
  fileLocation: string,
  name: string,
  code_players: Map<string, csvPlayer>
) {
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

  logger.info(`[${name}] cleanup`);
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

  logger.info(`[${name}] Getting events, sages, ...`);
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

  logger.info(`[${name}] Inserting Club data`);
  for (const club of dbClubs) {
    const internal = await addClubs(club);
    await addLocations(club, internal.id);
    await addTeams(club, internal.id);
  }

  await linkTeamsToEvents();

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

      const dbEventIds = [...team.subEvents?.map(r => r.eventId)];
      const where = {
        clubId: team.clubId,
        linkId: {
          [Op.any]: dbEventIds
        },
        linkType: 'competition'
      };

      let query = '';
      try {
        let memo = `Index: ${team.baseIndex}`;

        const issues = validate(team, team.subEvents[0], code_players);

        let teamName = sql_escaped(team.name);
        if (issues.hasIssues) {
          teamName = `* ${teamName}`;
          if (issues.status.length > 0) {
            memo += `\n\nStatus Speler fouten:\n${issues.status
              .map(r => ` - ${sql_escaped(r)}`)
              .join('\n')}`;
          }
          if (issues.level.length > 0) {
            memo += `\n\nLevel Speler vekereerd:\n${issues.level
              .map(r => ` - ${sql_escaped(r)}`)
              .join('\n')}`;
          }
          if (issues.base.length > 0) {
            memo += `\n\nPloeg verkeerd:\n${issues.base
              .map(r => ` - ${sql_escaped(r)}`)
              .join('\n')}`;
          }
        }

        const comments = await Comment.findAll({
          where
        });
        if (comments && comments.length > 0 && comments[0].message.length > 0) {
          logger.debug(`[${name}] Logging adding comments`, comments);
          memo += `\n\nClub opmerking:\n${comments
            .map(r => sql_escaped(r.message))
            .join('\n')}`;
        }

        query = `UPDATE Team set [memo] = "${memo}", name = "${teamName}" where id = ${teamId}`;

        // TODO: add issues
        await connection.execute(query);
      } catch (e) {
        logger.error(`[${name}] Comments didn't work`, {
          where,
          query,
          error: e
        });

        throw e;
      }

      logger.debug(
        `[${name}] Added Entry team: ${teamId}, event: ${myEvent.id} (entryId: ${entryRes[0].id}, stageId: ${stageRes[0].id})`
      );
    }
  }

  function getCsvBaseIndex(team: Team) {
    const basePlayers = team.basePlayers.map(p => {
      const csvPlayer = code_players.get(p.memberId);

      return {
        ...p.toJSON(),
        lastRankingPlace: {
          single: parseInt(csvPlayer?.PlayerLevelSingle, 10) || 12,
          double: parseInt(csvPlayer?.PlayerLevelDouble, 10) || 12,
          mix: parseInt(csvPlayer?.PlayerLevelMixed, 10) || 12
        }
      } as Partial<Player>;
    });

    if (team.type !== 'MX') {
      const bestPlayers = basePlayers
        .map(r => r.lastRankingPlace?.single + r.lastRankingPlace?.double)
        .sort((a, b) => a - b)
        .slice(0, 4);

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (bestPlayers.length - 4) * 24;
      }

      return bestPlayers.reduce((a, b) => a + b, missingIndex);
    } else {
      const bestPlayers = [
        // 2 best male
        ...basePlayers
          .filter(p => p.gender == 'M')
          .map(
            r =>
              r.lastRankingPlace?.single +
              r.lastRankingPlace?.double +
              r.lastRankingPlace?.mix
          )
          .sort((a, b) => a - b)
          .slice(0, 2),
        // 2 best female
        ...basePlayers
          .filter(p => p.gender == 'F')
          .map(
            r =>
              r.lastRankingPlace?.single +
              r.lastRankingPlace?.double +
              r.lastRankingPlace?.mix
          )
          .sort((a, b) => a - b)
          .slice(0, 2)
      ];

      let missingIndex = 0;
      if (bestPlayers.length < 4) {
        missingIndex = (bestPlayers.length - 4) * 36;
      }

      return bestPlayers.reduce((a, b) => a + b, missingIndex);
    }
  }

  async function addTeams(club: Club, internalClubId: number) {
    for (const team of club.teams) {
      // Manually overwrite the team index private value so it matches the csv version
      team['_baseIndex'] = getCsvBaseIndex(team);

      const prefLoc1 = locations.get(team.locations[0]?.id) ?? 'NULL';
      const prefLoc2 = locations.get(team.locations[1]?.id) ?? 'NULL';
      const captain =
        team.captain ??
        ({
          phone: '',
          email: '',
          fullName: ''
        } as Partial<Player>);
      const captainName = captain.fullName;
      const dayofweek = getDayOfWeek(team.preferredDay);
      const plantime = team.preferredTime ? `#${team.preferredTime}#` : 'NULL';

      const query = `INSERT INTO Team(name, club, country, entrydate, contact, phone, email, dayofweek, plantime, preferredlocation1, preferredlocation2) VALUES (
"${sql_escaped(
        team.name
      )}", ${internalClubId}, 19, #${insertDate}#, "${captainName}", "${
        captain.phone
      }", "${
        captain.email
      }", ${dayofweek}, ${plantime}, ${prefLoc1}, ${prefLoc2}
)`;

      try {
        const teamRes = await connection.execute(
          query,
          `SELECT @@Identity AS id`
        );
        logger.debug(
          `[${name}] Added Team ${team.name} (id: ${teamRes[0].id})`
        );
        teams.set(teamRes[0].id, team);
        await addBasePlayers(team, teamRes[0].id, internalClubId);
      } catch (e) {
        logger.error(`[${name}] Error adding team`, e, query);
        throw e;
      }
    }
  }

  async function addBasePlayers(
    team: Team,
    interalTeamId: number,
    internalClubId: number
  ) {
    for (const player of team.basePlayers) {
      let playerId = players.get(player.memberId);
      if (!playerId) {
        const csvPlayer = code_players.get(player.memberId);
        const code = csvPlayer?.code ?? '';
        const dob = csvPlayer?.dob ? `#${csvPlayer?.dob}#` : 'NULL';
        const single =
          parseInt(csvPlayer?.PlayerLevelSingle, 10) ||
          (player.lastRankingPlace?.single ?? 12);
        const double =
          parseInt(csvPlayer?.PlayerLevelDouble, 10) ||
          (player.lastRankingPlace?.double ?? 12);
        const mix =
          parseInt(csvPlayer?.PlayerLevelMixed, 10) ||
          (player.lastRankingPlace?.mix ?? 12);

        let memberid = player?.memberId;
        const gender = getGender(player.gender);
        const queryPlayer = `INSERT INTO Player(name, firstname, gender, memberid, club, foreignid, dob) VALUES (
          "${sql_escaped(player.lastName)}", "${sql_escaped(
          player.firstName
        )}", ${gender}, ${memberid}, ${internalClubId}, "${code}", ${dob})`;

        try {
          const playerRes = await connection.execute(
            queryPlayer,
            `SELECT @@Identity AS id`
          );
          playerId = playerRes[0].id;
          players.set(player.memberId, playerId);

          const queryLevel = `INSERT INTO PlayerlevelEntry(leveltype, playerid, level1, level2, level3) VALUES (1, ${playerId}, ${single}, ${double}, ${mix})`;
          try {
            await connection.execute(queryLevel);
          } catch (e) {
            logger.error('Error adding player', {
              query: queryLevel,
              error: e
            });
            throw e;
          }
        } catch (e) {
          logger.error('Error adding player', { query: queryPlayer, error: e });
          throw e;
        }
      }

      await connection.execute(
        `INSERT INTO TeamPlayer(team, player, status) VALUES (${interalTeamId}, ${playerId}, 1)`
      );

      logger.debug(
        `[${name}] Added Player ${player.fullName} (id: ${playerId})`
      );
    }
  }

  async function addClubs(club: Club) {
    try {
      const clubRes = await connection.execute(
        `INSERT INTO Club(name, clubId, country, abbreviation) VALUES ("${sql_escaped(
          club.name
        )}", "${club.clubId}", 19, "${club.abbreviation}")`,
        `SELECT @@Identity AS id`
      );
      const response = clubRes[0];

      logger.debug(`[${name}] Added club ${club.name} (id: ${response.id})`);
      clubs.set(response.id, club);
      return response;
    } catch (e) {
      logger.error(`[${name}] Added club failed`, e);
      throw e;
    }
  }

  function validate(
    team: Team,
    subEvent: SubEventCompetition,
    code_players: Map<string, csvPlayer>
  ) {
    const issues = {
      level: [],
      base: [],
      status: [],
      hasIssues: false
    };

    for (const player of team.basePlayers) {
      const csvPlayer = code_players.get(player.memberId);
      const single =
        parseInt(csvPlayer?.PlayerLevelSingle, 10) ||
        (player.lastRankingPlace?.single ?? 12);
      const double =
        parseInt(csvPlayer?.PlayerLevelDouble, 10) ||
        (player.lastRankingPlace?.double ?? 12);
      const mix =
        parseInt(csvPlayer?.PlayerLevelMixed, 10) ||
        (player.lastRankingPlace?.mix ?? 12);

      if (csvPlayer?.TypeName != 'Competitiespeler') {
        issues.hasIssues = true;
        issues.status.push(`${player.fullName} is geen competitie speler`);
      }

      // First team doesn't have any restrictions
      if (team.teamNumber > 1) {
        if (player?.lastRankingPlace) {
          if (single < subEvent.maxLevel) {
            issues.hasIssues = true;
            issues.level.push(
              `${player.fullName} mag niet in basis (single: ${single}, max: ${subEvent.maxLevel})`
            );
          }
          if (double < subEvent.maxLevel) {
            issues.hasIssues = true;
            issues.level.push(
              `${player.fullName} mag niet in basis (double: ${double}, max: ${subEvent.maxLevel})`
            );
          }
          if (subEvent.eventType == 'MX') {
            if (mix < subEvent.maxLevel) {
              issues.hasIssues = true;
              issues.level.push(
                `${player.fullName} mag niet in basis (mix: ${mix}, max: ${subEvent.maxLevel})`
              );
            }
          }
        }
      }
    }

    if (team.baseIndex < subEvent.minBaseIndex) {
      issues.hasIssues = true;
      issues.base.push(`Ploegindex te laag voor afdeling`);
    }

    if (team.baseIndex > subEvent.maxBaseIndex) {
      issues.hasIssues = true;
      issues.base.push(`Ploegindex te hoog voor afdeling`);
    }

    if (team.captain == null) {
      issues.hasIssues = true;
      issues.base.push(`Kapitein ontbreekt`);
    }

    if (team.locations == null || team.locations?.length == 0) {
      issues.hasIssues = true;
      issues.base.push(`Locatie ontbreekt`);
    }

    if (team.preferredDay == null || team.preferredTime == null) {
      issues.hasIssues = true;
      issues.base.push(`Voorkeurs speelmoment ontbreekt`);
    }

    if (team.basePlayers.length < 4) {
      issues.hasIssues = true;
      issues.base.push(`Missing ${4 - team.basePlayers.length} base players`);
    }

    return issues;
  }

  async function addLocations(club: Club, internalClubId: number) {
    for (const location of club?.locations) {
      const query = `INSERT INTO Location(name, address, postalcode, city, phone, clubid) VALUES ("${sql_escaped(
        location.name
      )}", "${sql_escaped(location.street)} ${location.streetNumber}", "${
        location.postalcode
      }", "${location.city}", "${location.phone}", ${internalClubId} )`;
      try {
        const locationRes = await connection.execute(
          query,
          `SELECT @@Identity AS id`
        );

        logger.debug(
          `[${name}] Added location ${location.name} (id: ${locationRes[0].id})`
        );
        locations.set(location.id, locationRes[0].id);
      } catch (e) {
        logger.error(`[${name}] Added location failed`, {
          error: e,
          query
        });
        throw e;
      }
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
      case 'V':
        return 2;

      default:
        logger.warn('no gender?', gender);
    }
  }
}

function sql_escaped(str) {
  str = str.replace(/\"/g, "'");
  return str;

  // return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function(char) {
  //   switch (char) {
  //     case '\0':
  //       return '\\0';
  //     case '\x08':
  //       return '\\b';
  //     case '\x09':
  //       return '\\t';
  //     case '\x1a':
  //       return '\\z';
  //     case '\n':
  //       return '\\n';
  //     case '\r':
  //       return '\\r';
  //     case '"':
  //     case "'":
  //     case '\\':
  //     case '%':
  //       return '\\' + char; // prepends a backslash to backslash, percent,
  //     // and double/single quotes
  //     default:
  //       return char;
  //   }
  // });
}
