import { EncounterCompetition } from '@badman/backend-database';
import { VisualService } from '@badman/backend-visual';
import { getSeasonPeriod } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment-timezone';
import { Op } from 'sequelize';
import xlsx from 'xlsx';

@Injectable()
export class WrongDatesService {
  private readonly logger = new Logger(WrongDatesService.name);
  private visualFormat = 'YYYY-MM-DDTHH:mm:ss';

  constructor(private readonly visualService: VisualService) {}

  async process(season: number) {
    const period = getSeasonPeriod(season) as [string, string];

    const encounters = await EncounterCompetition.findAll({
      where: {
        date: {
          [Op.between]: period,
        },
        originalDate: {
          [Op.ne]: null,
        },
      },
    });

    this.logger.log(`Found ${encounters.length} encounters`);

    const toChange = [];
    const notChanged = [];

    for (const encounter of encounters) {
      try {
        // Check if visual reality has same date stored
        const draw = await encounter.getDrawCompetition();
        const subEvent = await draw.getSubEventCompetition();
        const event = await subEvent.getEventCompetition();

        if (!event.visualCode) {
          this.logger.error(`No visual code found for ${event?.name}`);
          return;
        }

        if (!encounter.visualCode) {
          this.logger.error(`No visual code found for ${encounter?.id}`);
          return;
        }

        const result = await this.visualService.getDate(event.visualCode, encounter.visualCode, false);

        const dateBrussels = moment.tz(result, 'Europe/Brussels');

        if (dateBrussels.isSame(moment(encounter.date))) {
          continue;
        }

        const home = await encounter.getHome();
        const away = await encounter.getAway();

        if (dateBrussels.isSame(moment(encounter.originalDate))) {
          notChanged.push(
            `${home.name},${away.name},${dateBrussels.format(
              this.visualFormat,
            )},${moment(encounter.date).format(this.visualFormat)}`,
          );

          toChange.push({
            home: home.name,
            away: away.name,
            visual: dateBrussels.format(this.visualFormat),
            badman: moment(encounter.date).format(this.visualFormat),
          });

          // this.visualService.changeDate(
          //   event.visualCode,
          //   encounter.visualCode,
          //   encounter.date
          // );
          continue;
        }

        // encounter.synced = new Date();
      } catch (error) {
        this.logger.error(error);
      }
    }

    this.logger.debug(`Not changed: ${notChanged.length}`);

    // wirte to xlsx
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(toChange);
    xlsx.utils.book_append_sheet(wb, ws, 'To change');
    xlsx.writeFile(wb, `wrong-dates-${season}.xlsx`);
    

    this.logger.log('Done');
  }
}
