import {
  EventCompetition,
  Player,
  RankingPlace,
  RankingSystem,
} from '@badman/backend/database';
import { Injectable, Logger } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Sequelize } from 'sequelize-typescript';
import { Transaction } from 'sequelize';
import moment from 'moment';

@Injectable()
export class ResyncBaseTeamsService {
  private readonly logger = new Logger(ResyncBaseTeamsService.name);
  private readonly rankingDate = moment('2022-05-09').toDate();

  constructor(private _sequelize: Sequelize) {}

  async resyncBaseTeams() {
    const transaction = await this._sequelize.transaction(); 

    try {
      this.logger.log('Starting resync');
      await this.setPlayerIndexes(transaction);
      await this.reacalc(transaction);
      await transaction.commit();
      this.logger.log('Done');
    } catch (e) {
      await transaction.rollback();
      throw e;
    }
  }

  private async setPlayerIndexes(transaction?: Transaction) {
    const workbook = XLSX.readFile('./Lijst_index_seizoen_2022-2023.xlsx');
    const rows = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]]
    );

    const primarySystem = await RankingSystem.findOne({
      where: {
        primary: true,
      },
      transaction,
    });

    for (const row of rows) {
      let p = await Player.findOne({
        where: {
          memberId: row['Lidnummer'],
        },
        transaction,
      });

      if (!p) {
        if (row['Type'] == 'Competitiespeler') {
          this.logger.debug(`Player ${row['Lidnummer']} not found`);
          p = new Player({
            memberId: row['Lidnummer'],
            firstName: row['Voornaam'],
            lastName: row['Achternaam'],
          });
          // await p.save({ transaction });
        } else {
          // We don't care if a recreational player is not found
          continue;
        }
      }

      if (row['Type'] == 'Competitiespeler') {
        p.competitionPlayer = true;
      } else {
        p.competitionPlayer = false;
      }

      await p.save({
        transaction,
      });

      const place = await p.getRankingPlaces({
        where: {
          systemId: primarySystem.id,
          rankingDate: this.rankingDate,
        },
      });

      if (place.length > 0) {
        place[0].single = row['Klassement enkel'];
        place[0].double = row['Klassement dubbel'];
        place[0].mix = row['Klassement gemengd'];
        await place[0].save({ transaction });
      } else {
        if (p.competitionPlayer) {
          const rankingPlace = new RankingPlace({
            playerId: p.id,
            systemId: primarySystem.id,
            rankingDate: this.rankingDate,
            single: row['Klassement enkel'],
            double: row['Klassement dubbel'],
            mix: row['Klassement gemengd'],
          });
          await rankingPlace.save({ transaction });
        }
      }

    
    }
  }

  private async reacalc(transaction?: Transaction) {
    const events = await EventCompetition.findAll({
      where: {
        startYear: 2022,
      },
      transaction,
    });

    for (const event of events) {
      const subEvents = await event.getSubEventCompetitions({
        transaction,
      });
      for (const subEvent of subEvents) {
        const entries = await subEvent.getEventEntries({
          transaction,
        });

        if (entries.length === 0) {
          this.logger.debug(
            `No entry found for ${subEvent.name} in ${event.name}`
          );
          continue;
        }

        for (const entry of entries) {
          entry.changed('meta', true);
          await entry.save({
            transaction,
          });
        }
      }
    }
  }
}
