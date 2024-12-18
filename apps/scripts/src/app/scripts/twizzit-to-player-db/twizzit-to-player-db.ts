import { Player } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op, Transaction } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as XLSX from 'xlsx';

@Injectable()
export class TwizzitToPlayerDbService {
  private readonly logger = new Logger(TwizzitToPlayerDbService.name);

  constructor(private _sequelize: Sequelize) {}

  async process() {
    const transaction = await this._sequelize.transaction();

    try {
      this.logger.log('Starting resync');
      await this.setPlayerIndexes(transaction);
      await transaction.commit();
      this.logger.log('Done');
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  private async setPlayerIndexes(transaction?: Transaction) {
    const workbook = XLSX.readFile(
      './apps/scripts/src/app/scripts/twizzit-to-player-db/2024-12-18_12_51_42.xlsx',
    );
    const rows = XLSX.utils.sheet_to_json<InputExcel>(workbook.Sheets[workbook.SheetNames[0]]);

    // Find in Player table the player with the same naam and voornaam

    const inputPlayers: [lastName: string, firstName: string][] = [];

    for (const row of rows) {
      inputPlayers.push([row.Achternaam, row.Voornaam]);
      inputPlayers.push([row['Dubbelpartner Achternaam'], row.Dubbelpartner]);
      inputPlayers.push([row['Mixpartner Achternaam'], row.Mixpartner]);
    }

    const players = await Player.findAll({
      transaction,
      where: {
        [Op.or]: inputPlayers
          .filter(([lastName, firstName]) => lastName && firstName)
          .map(([lastName, firstName]) => ({
            lastName,
            firstName,
          })),
        memberId: {
          [Op.like]: '5%',
        },
      },
    });

    this.logger.log('Found ' + players.length + ' players');

    const glenn = players.find((player) => player.slug == 'glenn-latomme');

    if (glenn) {
      this.logger.log('Found glenn');
    }
    const playerPerLevel = new Map<string, [Player, Player][]>();

    rows.forEach((row) => {
      let player = players.find(
        (player) => player.lastName == row.Achternaam && player.firstName == row.Voornaam,
      );

      let plyerDubbelpartner = players.find(
        (player) =>
          player.lastName == row['Dubbelpartner Achternaam'] &&
          player.firstName == row.Dubbelpartner,
      );

      let plyerMixpartner = players.find(
        (player) =>
          player.lastName == row['Mixpartner Achternaam'] && player.firstName == row.Mixpartner,
      );

      if (!playerPerLevel.has('All')) {
        playerPerLevel.set('All', []);
      }

      if (!player && row.Achternaam && row.Voornaam) {
        player = new Player({
          lastName: row.Achternaam,
          firstName: row.Voornaam,
        });
      }

      if (!plyerDubbelpartner && row['Dubbelpartner Achternaam'] && row.Dubbelpartner) {
        plyerDubbelpartner = new Player({
          lastName: row['Dubbelpartner Achternaam'],
          firstName: row.Dubbelpartner,
        });
      }

      if (!plyerMixpartner && row['Mixpartner Achternaam'] && row.Mixpartner) {
        plyerMixpartner = new Player({
          lastName: row['Mixpartner Achternaam'],
          firstName: row.Mixpartner,
        });
      }
      // add all players to the first tab
      if (player) {
        playerPerLevel.get('All')?.push([player, null]);
      }

      if (plyerDubbelpartner) {
        playerPerLevel.get('All')?.push([plyerDubbelpartner, null]);
      }

      if (plyerMixpartner) {
        playerPerLevel.get('All')?.push([plyerMixpartner, null]);
      }

      // if player and dubble player add to map
      if (row['Dubbel op zondag'] != 'Geen dubbel') {
        // add to map based on value of Dubbel on zondag's value
        let key = `${player.gender}-${row['Dubbel op zondag']}`;
        if (
          row['Dubbel op zondag'] == 'Zeer sterk (sterke/zeer sterke recreant of klassement 11-12)'
        ) {
          key = 'GD-Zeer sterk';
        }

        if (!playerPerLevel.has(key)) {
          playerPerLevel.set(key, []);
        }

        playerPerLevel.get(key)?.push([player, plyerDubbelpartner]);
      }

      // if player and mix player add to map
      if (row['Mix op zaterdag'] != 'Geen mix') {
        // add to map based on value of Mix op zaterdag's value
        let key = `GD-${row['Mix op zaterdag']}`;
        if (
          row['Mix op zaterdag'] == 'Zeer sterk (sterke/zeer sterke recreant of klassement 11-12)'
        ) {
          key = 'GD-Zeer sterk';
        }
        if (!playerPerLevel.has(key)) {
          playerPerLevel.set(key, []);
        }

        playerPerLevel.get(key)?.push([player, plyerMixpartner]);
      }
    });

    // create a sheet per key with all players
    const wb = XLSX.utils.book_new();

    for (const [key, players] of playerPerLevel) {
      const ws = XLSX.utils.json_to_sheet(
        players.map(([p, partner]) => ({
          Lidnummer: p.memberId,
          Naam: p.lastName,
          Voornaam: p.firstName,
          Geslacht: p.gender,
          PartnerLidnummer: partner?.memberId,
          PartnerNaam: partner?.lastName,
          PartnerVoornaam: partner?.firstName,
          PartnerGeslacht: partner?.gender,
        })),
      );

      XLSX.utils.book_append_sheet(wb, ws, key);
    }
    XLSX.writeFile(
      wb,
      './apps/scripts/src/app/scripts/twizzit-to-player-db/player-export' +
        moment().format('YYYY-MM-DD_HH-mm-ss') +
        '.xlsx',
    );
  }
}

interface InputExcel {
  Id: string;
  'Created On': string;
  'Created By': string;
  'Dubbel op zondag': string;
  'Mix op zaterdag': string;
  Voornaam: string;
  Achternaam: string;
  Telefoon: string;
  Email: string;
  'Klassement dubbel': string;
  'Klassement mix': string;
  'Ik schrijf in': string;
  Dubbelpartner: string;
  'Dubbelpartner Achternaam': string;
  'Klassement partner dubbel': string;
  Mixpartner: string;
  'Mixpartner Achternaam': string;
  'Klassement partner mix': string;
  'Extra opmerkingen/telefoonnummers:': string;
  'Linked contact IDs': string;
}

interface OutputExcel {
  Lidnummer: string;
  Naam: string;
  Voornaam: string;
}
