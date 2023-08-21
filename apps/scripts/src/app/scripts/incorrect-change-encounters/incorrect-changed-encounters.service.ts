import {
  EncounterChange,
  EncounterChangeDate,
  EncounterCompetition,
  Team,
} from '@badman/backend-database';
import { ChangeEncounterAvailability } from '@badman/utils';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Op } from 'sequelize';
import * as XLSX from 'xlsx';

@Injectable()
export class IncorrectEncountersService {
  private readonly logger = new Logger(IncorrectEncountersService.name);

  async getIncorrectEncountersService(season: number) {
    this.logger.debug('getIncorrectEncountersService');
    const startDate = moment([season, 8, 1]).toDate();
    const endDate = moment([season + 1, 7, 1]).toDate();

    const encounters = await EncounterCompetition.findAll({
      attributes: ['id', 'date', 'originalDate', 'accepted'],
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
          model: EncounterChange,
          include: [
            {
              model: EncounterChangeDate,
            },
          ],
          required: true,
        },
      ],
    });

    let indexWithMostColumns = 0;
    let maxColumns = 0;

    const data = [
      [
        'Home Team',
        'Away Team',
        'Accepted',
        'link',
        'Current date',
        'Original date',
        'Probably wrong',
        '# Dates',
        'Suggestions',
      ],
      ...encounters.map((encounter) => {
        const dates = encounter.encounterChange?.dates?.filter(
          (d) =>
            d.availabilityAway === ChangeEncounterAvailability.POSSIBLE &&
            d.availabilityHome === ChangeEncounterAvailability.POSSIBLE
        );

        // Home team
        const home = encounter.home?.name ?? '';
        // Away team
        const away = encounter.away?.name ?? '';

        // Link
        const link = {
          t: 'external',
          v: `open in badman`,
          l: {
            Target: `http://localhost:3000/competition/change-encounter?club=${encounter.home?.clubId}&team=${encounter.home?.id}&encounter=${encounter.id}`,
            Tooltip: `Open in Badman`,
          },
        };

        // Current date
        if (!encounter.date) {
          throw new Error('No date found');
        }
        const currentDate = new Date(encounter.date).toLocaleString();

        // Original date
        if (!encounter.originalDate) {
          throw new Error('No original date found');
        }
        const originalDate = new Date(encounter.originalDate).toLocaleString();

        // Probably wrong
        const probablyWrong = moment(encounter.date).isSame(encounter.originalDate, 'minute');

        // Dates
        const datesCount = dates?.length ?? 0;

        // Suggestions
        const suggestions =
          dates?.map((d) => new Date(d.date!).toLocaleString()) ?? [];

        if (suggestions.length > maxColumns) {
          maxColumns = suggestions.length;
          indexWithMostColumns = encounters.indexOf(encounter) + 1;
        }

        return [
          home,
          away,
          encounter.accepted,
          link,
          currentDate,
          originalDate,
          probablyWrong,
          datesCount,
          ...suggestions,
        ];
      }),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Autosize columns
    const columnSizes = data[indexWithMostColumns].map((_, columnIndex) =>
      data.reduce(
        (acc, row) => Math.max(acc, (`${row[columnIndex]}`.length ?? 0) + 2),
        0
      )
    );
    ws['!cols'] = columnSizes.map((width) => ({ width }));

    // Enable filtering
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range(
        XLSX.utils.decode_range(ws['!ref'] as string)
      ),
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const fileName = `${season}-incorrect-changed-encounters.xlsx`;

    // Save the Excel file
    XLSX.writeFile(wb, fileName);

    this.logger.log(`Found ${encounters.length} changed encounters`);
  }
}
