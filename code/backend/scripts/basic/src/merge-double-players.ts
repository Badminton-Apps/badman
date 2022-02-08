import * as dbConfig from '@badvlasim/shared/database/database.config.js';
import { Op } from 'sequelize';
import { DataBaseHandler, Player, logger, Club } from '@badvlasim/shared';
import { parseString } from '@fast-csv/parse';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import csvWriter from 'csv-write-stream';
import { createWriteStream, unlinkSync } from 'fs';

(async () => {
  await merge_accounts();
})();

async function merge_accounts() {
  const destination = `merged.csv`;
  if (existsSync(destination)) {
    unlinkSync(destination);
  }
  const writer = csvWriter({
    headers: ['Lidnummer', 'Voornaam', 'Achternaam', 'Club', 'ExcelClub'],
  });
  writer.pipe(createWriteStream(destination, { flags: 'a' }));
  const databaseService = new DataBaseHandler(dbConfig.default);
  const transaction = await DataBaseHandler.sequelizeInstance.transaction();
  try {
    const players = await readCsvPlayers();

    const dbPlayers = await Player.findAll({
      transaction,
      where: {
        memberId: {
          [Op.in]: [...players.keys()],
        },
      },
    });

    for (const csvPlayer of players) {
      const found = dbPlayers.filter((p) => p.memberId == csvPlayer?.at(0));

      if (found.length == 0) {
        logger.info(`No player found for ${csvPlayer?.at(0)}`);
        continue;
      }

      if (found.length > 1) {
        let bestMatch = found.find(
          (p) =>
            p.firstName == csvPlayer?.at(1).Voornaam &&
            p.lastName == csvPlayer?.at(1).Achternaam
        );

        if (!bestMatch) {
          bestMatch = found.find(
            (p) =>
              p.lastName == csvPlayer?.at(1).Voornaam &&
              p.firstName == csvPlayer?.at(1).Achternaam
          );
          bestMatch.firstName = csvPlayer?.at(1).Voornaam;
          bestMatch.lastName = csvPlayer?.at(1).Achternaam;
          await bestMatch.save({ transaction });
        }

        if (!bestMatch) {
          bestMatch = found?.at(0);
        }
        const remaining = found.filter((p) => p.id != bestMatch.id);

        for (const player of remaining) {
          logger.debug(
            `Merging ${bestMatch.fullName}(${bestMatch.memberId}) with ${player.fullName}(${player.memberId})`
          );

          await databaseService.mergePlayers(bestMatch.id, player.id, {
            transaction,
          });
        }

        const finishedPlayer = await Player.findByPk(bestMatch.id, {
          include: [Club],
          transaction,
        });
        const clubs = finishedPlayer.clubs
          .filter((c) => c.getDataValue('end') == null)
          .map((c) => c.fullName.toLocaleLowerCase());

        writer.write({
          Lidnummer: finishedPlayer.memberId,
          Voornaam: finishedPlayer.firstName,
          Achternaam: finishedPlayer.lastName,
          Club: clubs.join(', '),
          ExcelClub: csvPlayer?.at(1).Club,
        });
      }
    }
    writer.end();
    await transaction.commit();
  } catch (err) {
    logger.error('Something went wrong merging players', err);
    await transaction.rollback();
    throw err;
  }
}

async function readCsvPlayers(): Promise<Map<string, any>> {
  return new Promise((resolve, reject) => {
    const csv = readFileSync(
      path.join(process.cwd(), './src/files/Lijst_index_seizoen_2021-2022.csv'),
      'utf8'
    );
    const stream = parseString(csv, {
      headers: true,
      delimiter: ';',
      ignoreEmpty: true,
    });

    const data = new Map();
    stream.on('data', (row) => {
      data.set(row.Lidnummer, row);
    });
    stream.on('error', (error) => {
      logger.error(error);
      reject(error);
    });
    stream.on('end', async (rowCount) => {
      resolve(data);
    });
  });
}
