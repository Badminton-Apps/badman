import { EncounterChange, EncounterCompetition, Team } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import { writeFile } from 'fs/promises';
import moment from 'moment';
import { Op } from 'sequelize';

@Injectable()
export class ChangedEncountersService {
  private readonly logger = new Logger(ChangedEncountersService.name);

  async getNonConfirmedEncounters(season: number) {
    this.logger.debug('getNonConfirmedEncounters');
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
          attributes: ['id'],
          model: EncounterChange,
          required: true,
        },
      ],
    });

    // Write to csv file
    const csv =
      `home,away,link\n` +
      encounters
        .map((encounter) => {
          return `${encounter.home?.name},${encounter.away?.name},https://badman.app/competition/change-encounter?club=${encounter.home?.clubId}&team=${encounter.home?.id}&encounter=${encounter.id}`;
        })
        .join('\n');
    const fileName = `${season}-changed-encounters.csv`;

    await writeFile(fileName, csv);

    this.logger.log(`Found ${encounters.length} changed encounters`);
  }
}
