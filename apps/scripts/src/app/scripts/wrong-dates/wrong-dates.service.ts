import { EncounterCompetition } from '@badman/backend-database';
import { VisualService } from '@badman/backend-visual';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment-timezone';
import { Op } from 'sequelize';

@Injectable()
export class WrongDatesService {
  private readonly logger = new Logger(WrongDatesService.name);
  private visualFormat = 'YYYY-MM-DDTHH:mm:ss';

  constructor(private readonly visualService: VisualService) {}

  async fixWrongDates(year: number) {
    const startDate = moment([year, 9, 1]).toDate();
    const endDate = moment([year + 1, 7, 1]).toDate();

    const encounters = await EncounterCompetition.findAll({
      where: {
        date: {
          [Op.between]: [startDate, endDate],
        },
        originalDate: {
          [Op.ne]: null,
        },
      },
    });

    this.logger.log(`Found ${encounters.length} encounters`);

    const wrongTimezone = [];
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

        const result = await this.visualService.getDate(event.visualCode, encounter.visualCode);

        const dateBrussels = moment.tz(result, 'Europe/Brussels');

        if (dateBrussels.isSame(moment(encounter.date))) {
          continue;
        }

        const home = await encounter.getHome();
        const away = await encounter.getAway();
        const gmtWrong = moment.tz(result, 'Etc/GMT+0');
        // Check if it was submitted without timezone update
        if (gmtWrong.isSame(moment(encounter.date))) {
          wrongTimezone.push(
            `${home.name},${away.name},${gmtWrong.format(
              this.visualFormat,
            )},${moment(encounter.date).format(this.visualFormat)}`,
          );

          // this.visualService.changeDate(
          //   event.visualCode,
          //   encounter.visualCode,
          //   encounter.date
          // );

          continue;
        }

        if (dateBrussels.isSame(moment(encounter.originalDate))) {
          notChanged.push(
            `${home.name},${away.name},${dateBrussels.format(
              this.visualFormat,
            )},${moment(encounter.date).format(this.visualFormat)}`,
          );

          // this.visualService.changeDate(
          //   event.visualCode,
          //   encounter.visualCode,
          //   encounter.date
          // );
          continue;
        }

        // this.logger.log(`Changing date for encounter ${encounter.id}`);

        // encounter.synced = new Date();
      } catch (error) {
        this.logger.error(error);
      }
    }

    this.logger.debug(`Wrong timezone: ${wrongTimezone.length}`);
    this.logger.debug(`Not changed: ${notChanged.length}`);

    this.logger.log('Done');

    // await writeFile(
    //   'wrong-timezone.csv',
    //   `home,away,wrong,right\n${wrongTimezone.join('\n')}`
    // );
    // await writeFile(
    //   'wrong-date.csv',
    //   `home,away,wrong,right\n${notChanged.join('\n')}`
    // );
  }
}
