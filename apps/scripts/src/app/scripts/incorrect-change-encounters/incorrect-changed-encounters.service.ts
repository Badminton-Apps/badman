import {
  DrawCompetition,
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
  EventCompetition,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { VisualService } from '@badman/backend-visual';
import { ChangeEncounterAvailability } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';

@Injectable()
export class IncorrectEncountersService {
  constructor(private readonly visualService: VisualService) {}

  private readonly logger = new Logger(IncorrectEncountersService.name);

  private async getChangeEncounters(startDate: Date, endDate: Date) {
    return EncounterCompetition.findAll({
      attributes: ['id', 'date', 'originalDate', 'visualCode'],
      where: {
        originalDate: {
          [Op.ne]: null,
        },
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      include: [
        { attributes: ['id', 'name', 'clubId'], model: Team, as: 'home' },
        { attributes: ['id', 'name', 'clubId'], model: Team, as: 'away' },
        {
          attributes: ['id'],
          model: DrawCompetition,
          include: [
            {
              attributes: ['id'],
              model: SubEventCompetition,
              include: [
                {
                  attributes: ['id', 'visualCode'],
                  model: EventCompetition,
                },
              ],
            },
          ],
        },
        {
          attributes: ['id', 'accepted'],
          model: EncounterChange,
          include: [
            {
              model: EncounterChangeDate,
              where: {
                availabilityAway: ChangeEncounterAvailability.POSSIBLE,
                availabilityHome: ChangeEncounterAvailability.POSSIBLE,
              },
            },
          ],
          required: true,
        },
      ],
    });
  }

  async sendEncountersToVisual(season: number) {
    const startDate = moment([season, 8, 1]).toDate();
    const endDate = moment([season + 1, 7, 1]).toDate();

    const encounters = await this.getChangeEncounters(startDate, endDate);

    // send to visual
    this.logger.log(`Loaded ${encounters.length} changed encounters`);

    const filtered = encounters.filter((encounter) => {
      const date = moment(encounter.date);
      const dates = encounter.encounterChange?.dates?.map((d) =>
        moment(d.date),
      );

      if (!dates) {
        return false;
      }

      return !dates.some((d) => d.isSame(date, 'minute'));
    });

    this.logger.log(`Sending ${filtered.length} changed encounters to visual`);
    const data: unknown[][] = [
      [
        'Id',
        'Home Team',
        'Away Team',
        'Link',
        'Current date',
        'Moved',
        '# Dates',
        'Suggestion(s)',
      ],
    ]; // Array to hold Excel data

    for (const encounter of filtered) {
      if (
        !encounter?.drawCompetition?.subEventCompetition?.eventCompetition
          ?.visualCode
      ) {
        this.logger.error(`No visual code found for encounter ${encounter.id}`);
        continue;
      }

      if (!encounter.visualCode) {
        this.logger.error(`No visual code found for encounter ${encounter.id}`);
        continue;
      }

      try {
        if ((encounter.encounterChange?.dates?.length ?? 0) > 1) {
          this.logger.log(
            `encounter ${encounter.home?.name} vs ${encounter.away
              ?.name} on ${moment(encounter.date).format(
              'DD-MM-YYYY HH:mm',
            )} has multiple dates`,
          );

          data.push(this.addRowWithMultipleDates(encounter));

          continue;
        }
        // get first suggestion
        const firstSuggestion = encounter.encounterChange?.dates?.[0]?.date;

        if (!firstSuggestion) {
          this.logger.error(
            `No first suggestion found for encounter ${encounter.id}`,
          );
          continue;
        }

        this.logger.log(
          `Sending encounter ${encounter.home?.name} vs ${encounter.away
            ?.name} from ${moment(encounter.date).format(
            'DD-MM-YYYY HH:mm',
          )} to date ${moment(firstSuggestion).format('DD-MM-YYYY HH:mm')}`,
        );

        data.push(this.addRowWithOneDate(encounter));

        // // send to visual
        // await this.visualService.changeDate(
        //   encounter.drawCompetition.subEventCompetition.eventCompetition
        //     .visualCode,
        //   encounter.visualCode,
        //   firstSuggestion
        // );

        // // update badman
        // await encounter.update({ date: firstSuggestion });
      } catch (e) {
        this.logger.error(`Error sending encounter ${encounter.id} to visual`);
        this.logger.error(e);
      }
    }

    await this.generateExcelFile(data, season);
  }

  // 2 methods for adding rows to an excel file, one is for adding the row with multiple dates,
  // the other is for adding the row where there was only one date

  private addRowWithMultipleDates(encounter: EncounterCompetition) {
    // Link
    const link = {
      t: 'external',
      v: `open in badman`,
      l: {
        Target: `https://badman.app/competition/change-encounter?club=${encounter.home?.clubId}&team=${encounter.home?.id}&encounter=${encounter.id}`,
        Tooltip: `Open in Badman`,
      },
    };

    // Assuming you want to add data to the array 'data' in this format
    return [
      encounter.id,
      encounter.home?.name,
      encounter.away?.name,
      link,
      moment(encounter.date).format('DD-MM-YYYY HH:mm'),
      'NO',
      encounter.encounterChange?.dates?.length ?? 0,
      ...(encounter.encounterChange?.dates?.map((d) =>
        moment(d.date).format('DD-MM-YYYY HH:mm'),
      ) ?? []),
    ];
  }

  private addRowWithOneDate(encounter: EncounterCompetition) {
    // Link
    const link = {
      t: 'external',
      v: `open in badman`,
      l: {
        Target: `https://badman.app/competition/change-encounter?club=${encounter.home?.clubId}&team=${encounter.home?.id}&encounter=${encounter.id}`,
        Tooltip: `Open in Badman`,
      },
    };

    // Assuming you want to add data to the array 'data' in this format
    return [
      encounter.id,
      encounter.home?.name,
      encounter.away?.name,
      link,
      moment(encounter.date).format('DD-MM-YYYY HH:mm'),
      'YES',
      encounter.encounterChange?.dates?.length ?? 0,
      ...(encounter.encounterChange?.dates?.map((d) =>
        moment(d.date).format('DD-MM-YYYY HH:mm'),
      ) ?? []),
    ];
  }

  private async generateExcelFile(data: unknown[][], season: number) {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();

    // Find the row with the most columns
    let indexWithMostColumns = 0;
    let maxColumns = 0;
    data.forEach((row, index) => {
      if (row.length > maxColumns) {
        maxColumns = row.length;
        indexWithMostColumns = index;
      }
    });

    // Autosize columns
    const columnSizes = data[indexWithMostColumns].map((_, columnIndex) =>
      data.reduce(
        (acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2),
        0,
      ),
    );
    ws['!cols'] = columnSizes.map((width) => ({ width }));

    // Enable filtering
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range(
        XLSX.utils.decode_range(ws['!ref'] as string),
      ),
    };

    XLSX.utils.book_append_sheet(wb, ws, 'Encounter Data na sync');
    const fileName = `${season}-incorrect-changed-encounters-pt2.xlsx`;
    XLSX.writeFile(wb, fileName);
  }
}
