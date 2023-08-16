import {
  EncounterChange,
  EncounterCompetition,
  Team,
} from '@badman/backend-database';
import { ChangeEncounterAvailability } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import moment from 'moment';
import { Op } from 'sequelize';

@Injectable()
export class IncorrectEncountersService {
  private readonly logger = new Logger(IncorrectEncountersService.name);

  async getIncorrectEncountersService(season: number) {
    this.logger.debug('getIncorrectEncountersService');
    const startDate = moment([season, 9, 1]).toDate();
    const endDate = moment([season + 1, 7, 1]).toDate();

    const encounters = await EncounterCompetition.findAll({
      attributes: ['id'],
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        { attributes: ['id', 'name', 'clubId'], model: Team, as: 'home' },
        { attributes: ['name'], model: Team, as: 'away' },
        {
          attributes: ['id', 'dates'],
          model: EncounterChange,
          required: true,
        },
      ],
    });

    // Write to csv file
    const csv =
      `home,away,link,dates\n` +
      encounters
        .map((encounter) => {
          const dates = encounter.encounterChange?.dates?.filter(
            (d) =>
              d.availabilityAway == ChangeEncounterAvailability.POSSIBLE &&
              d.availabilityHome == ChangeEncounterAvailability.POSSIBLE
          );

          return `${encounter.home?.name},${
            encounter.away?.name
          },https://badman.app/competition/change-encounter?club=${
            encounter.home?.clubId
          }&team=${encounter.home?.id}&encounter=${encounter.id},${
            encounter.date == encounter.originalDate
          },${dates?.map((d) => d.date).join(',') ?? ''}`; 
        })
        .join('\n');
    const fileName = `${season}-incorrect-changed-encounters.csv`;

    await writeFile(fileName, csv);

    this.logger.log(`Found ${encounters.length} changed encounters`);
  }
}
