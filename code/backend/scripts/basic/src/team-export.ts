import {
  Club,
  DataBaseHandler,
  EventCompetition,
  LastRankingPlace,
  Location,
  logger,
  Player,
  SubEventCompetition,
  SubEventType,
  Team
} from '@badvlasim/shared';
import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { parseString } from '@fast-csv/parse';
import csvWriter from 'csv-write-stream';
import { WriteStream } from 'fs';
import { createWriteStream, readFile } from 'fs';
import { unlink } from 'fs/promises';

interface csvPlayer {
  code: string;
  dob: string;
  phone: string;
  email: string;
  TypeName: string;
  PlayerLevelSingle: number;
  PlayerLevelDouble: number;
  PlayerLevelMixed: number;
}

const YEAR = 2021;
const ROOT = `D:\\Programming\\Code\\Badminton-Vlaanderen\\files\\competition\\`;

(async () => {
  team_export();
})();

async function team_export() {
  const destination = `${ROOT}\\${YEAR}-${YEAR + 1}\\team_export.csv`;
  let writer: WriteStream;
  try {
    await unlink(destination);
  } catch (e) {}

  writer = csvWriter({
    headers: [
      'is_correct',
      // Basic info
      'club',
      'club_id',
      'team',
      'contact',
      'tel',
      'email',
      // Reeks
      'prov',
      'onderdeel',
      'reeks',

      'player1',
      'player2',
      'player3',
      'player4',

      // Index
      'team_index',
      'min_index',
      'max_index',

      // Base players
      'min_level',
      'player1_level',
      'player2_level',
      'player3_level',
      'player4_level',

      // Combined
      'index_correct',
      'basis_spelers_level_correct',
      'basis_spelers_statuut_correct',
      'captain_correct',
      'speler1_statuut',
      'speler2_statuut',
      'speler3_statuut',
      'speler4_statuut',
      'speler1_level',
      'speler2_level',
      'speler3_level',
      'speler4_level'
    ]
  });
  writer.pipe(createWriteStream(destination, { flags: 'a' }));

  const players = await readCsvPlayers();
  await updateCsvFile(writer, players);

  writer.end();
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

          row = {
            ...row,
            PlayerLevelSingle: parseInt(row.PlayerLevelSingle, 10),
            PlayerLevelDouble: parseInt(row.PlayerLevelDouble, 10),
            PlayerLevelMixed: parseInt(row.PlayerLevelMixed, 10)
          };

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

async function updateCsvFile(
  writer: WriteStream,
  code_players: Map<string, csvPlayer>
) {
  new DataBaseHandler(dbConfig.default);

  const dbTeams = await Team.findAll({
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
            where: {
              startYear: YEAR
            }
          }
        ]
      },
      {
        model: Location
      },
      {
        model: Club
      },
      {
        model: Player,
        as: 'players',
        include: [LastRankingPlace],
        through: {
          where: { base: true }
        }
      },
      {
        model: Player,
        as: 'captain'
      }
    ]
  });

  for (const team of dbTeams) {
    const subEvent = team.subEvents[0];
    logger.debug(`running for team: ${team.name}`);
    const outputRow = {
      is_correct: true,
      prov: subEvent.event.name,
      club: team.club.name,
      club_id: team.club.clubId,
      team: team.name,
      contact: team.captain?.fullName,
      tel: team.captain?.phone,
      email: team.captain?.email,
      onderdeel: subEvent.name,
      reeks: subEvent.eventType,
      team_index: null,
      min_index: subEvent.minBaseIndex,
      max_index: subEvent.maxBaseIndex,
      min_level: subEvent.maxLevel,
      player1: team.basePlayers[0]?.fullName,
      player2: team.basePlayers[1]?.fullName,
      player3: team.basePlayers[2]?.fullName,
      player4: team.basePlayers[3]?.fullName,

      player1_level: null,
      player2_level: null,
      player3_level: null,
      player4_level: null,

      index_correct: true,
      basis_spelers_level_correct: true,
      basis_spelers_statuut_correct: true,
      captain_correct: true,
      speler1_statuut: true,
      speler2_statuut: true,
      speler3_statuut: true,
      speler4_statuut: true,
      speler1_level: true,
      speler2_level: true,
      speler3_level: true,
      speler4_level: true
    };

    const player1_ranking = code_players.get(team.basePlayers[0]?.memberId) ?? {
      PlayerLevelSingle: 12,
      PlayerLevelDouble: 12,
      PlayerLevelMixed: 12,
      TypeName: 'nope'
    };
    const player2_ranking = code_players.get(team.basePlayers[1]?.memberId) ?? {
      PlayerLevelSingle: 12,
      PlayerLevelDouble: 12,
      PlayerLevelMixed: 12,
      TypeName: 'nope'
    };
    const player3_ranking = code_players.get(team.basePlayers[2]?.memberId) ?? {
      PlayerLevelSingle: 12,
      PlayerLevelDouble: 12,
      PlayerLevelMixed: 12,
      TypeName: 'nope'
    };
    const player4_ranking = code_players.get(team.basePlayers[3]?.memberId) ?? {
      PlayerLevelSingle: 12,
      PlayerLevelDouble: 12,
      PlayerLevelMixed: 12,
      TypeName: 'nope'
    };

    if (team.type === SubEventType.MX) {
      outputRow.player1_level = Math.min(
        player1_ranking.PlayerLevelSingle,
        player1_ranking.PlayerLevelDouble,
        player1_ranking.PlayerLevelMixed
      );
      outputRow.player2_level = Math.min(
        player2_ranking.PlayerLevelSingle,
        player2_ranking.PlayerLevelDouble,
        player2_ranking.PlayerLevelMixed
      );
      outputRow.player3_level = Math.min(
        player3_ranking.PlayerLevelSingle,
        player3_ranking.PlayerLevelDouble,
        player3_ranking.PlayerLevelMixed
      );
      outputRow.player4_level = Math.min(
        player4_ranking.PlayerLevelSingle,
        player4_ranking.PlayerLevelDouble,
        player4_ranking.PlayerLevelMixed
      );

      team['_baseIndex'] = [
        player1_ranking.PlayerLevelSingle,
        player1_ranking.PlayerLevelDouble,
        player1_ranking.PlayerLevelMixed,
        player2_ranking.PlayerLevelSingle,
        player2_ranking.PlayerLevelDouble,
        player2_ranking.PlayerLevelMixed,
        player3_ranking.PlayerLevelSingle,
        player3_ranking.PlayerLevelDouble,
        player3_ranking.PlayerLevelMixed,
        player4_ranking.PlayerLevelSingle,
        player4_ranking.PlayerLevelDouble,
        player4_ranking.PlayerLevelMixed
      ].reduce((a, b) => a + b, 0);
    } else {
      outputRow.player1_level = Math.min(
        player1_ranking.PlayerLevelSingle,
        player1_ranking.PlayerLevelDouble
      );
      outputRow.player2_level = Math.min(
        player2_ranking.PlayerLevelSingle,
        player2_ranking.PlayerLevelDouble
      );
      outputRow.player3_level = Math.min(
        player3_ranking.PlayerLevelSingle,
        player3_ranking.PlayerLevelDouble
      );
      outputRow.player4_level = Math.min(
        player4_ranking.PlayerLevelSingle,
        player4_ranking.PlayerLevelDouble
      );
      team['_baseIndex'] = [
        player1_ranking.PlayerLevelSingle,
        player1_ranking.PlayerLevelDouble,
        player2_ranking.PlayerLevelSingle,
        player2_ranking.PlayerLevelDouble,
        player3_ranking.PlayerLevelSingle,
        player3_ranking.PlayerLevelDouble,
        player4_ranking.PlayerLevelSingle,
        player4_ranking.PlayerLevelDouble
      ].reduce((a, b) => a + b, 0);
    }
    outputRow.team_index = team.baseIndex;

    // #region Team stuff
    if (team.baseIndex < subEvent.minBaseIndex) {
      outputRow.is_correct = false;
      outputRow.index_correct = false;
    }

    if (team.baseIndex > subEvent.maxBaseIndex) {
      outputRow.is_correct = false;
      outputRow.index_correct = false;
    }
    if (team.captain === null) {
      outputRow.is_correct = false;
      outputRow.captain_correct = false;
    }

    // #endregion

    // #region Player stuff
    if (player1_ranking?.TypeName != 'Competitiespeler') {
      outputRow.is_correct = false;
      outputRow.basis_spelers_statuut_correct = false;
      outputRow.speler1_statuut = false;
    }
    if (player2_ranking?.TypeName != 'Competitiespeler') {
      outputRow.is_correct = false;
      outputRow.basis_spelers_statuut_correct = false;
      outputRow.speler2_statuut = false;
    }
    if (player3_ranking?.TypeName != 'Competitiespeler') {
      outputRow.is_correct = false;
      outputRow.basis_spelers_statuut_correct = false;
      outputRow.speler3_statuut = false;
    }
    if (player4_ranking?.TypeName != 'Competitiespeler') {
      outputRow.is_correct = false;
      outputRow.basis_spelers_statuut_correct = false;
      outputRow.speler4_statuut = false;
    }

    if (outputRow.player1_level < subEvent.maxLevel) {
      outputRow.is_correct = false;
      outputRow.basis_spelers_level_correct = false;
      outputRow.speler1_level = false;
    }
    if (outputRow.player2_level < subEvent.maxLevel) {
      outputRow.is_correct = false;
      outputRow.basis_spelers_level_correct = false;
      outputRow.speler2_level = false;
    }
    if (outputRow.player3_level < subEvent.maxLevel) {
      outputRow.is_correct = false;
      outputRow.basis_spelers_level_correct = false;
      outputRow.speler3_level = false;
    }
    if (outputRow.player4_level < subEvent.maxLevel) {
      outputRow.is_correct = false;
      outputRow.basis_spelers_level_correct = false;
      outputRow.speler4_level = false;
    }

    // #endregion

    writer.write(outputRow);
  }
}
