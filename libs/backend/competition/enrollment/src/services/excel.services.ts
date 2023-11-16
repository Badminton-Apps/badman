import { EventCompetition, Player, Team } from '@badman/backend-database';
import { SubEventTypeEnum, sortPlayers } from '@badman/utils';
import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';

// A excel generation service
@Injectable()
export class ExcelService {
  async GetEnrollment(eventId: string) {
    const event = await EventCompetition.findByPk(eventId);
    const subEvents = await event?.getSubEventCompetitions({
      order: [
        ['eventType', 'ASC'],
        ['level', 'ASC'],
      ],
    });

    const data: (string | number | undefined)[][] = [
      [
        'Naam',
        'Voornaam',
        'Lidnummer',
        'Geslacht',
        'Ploeg',
        'Enkel',
        'Dubbel',
        'Gemengd',
        'Afdeling',
        'Reeks',
        'Somindex gemengde competitie',
        'Somindex heren-/damescompetitie',
      ],
    ]; // Array to hold Excel data

    for (const subEvent of subEvents ?? []) {
      const draws = await subEvent?.getDrawCompetitions();

      for (const draw of draws ?? []) {
        const entries = await draw?.getEntries({
          include: [{ model: Team }],
          order: [['team', 'name', 'ASC']],
        });
        for (const entry of entries) {
          for (const meta of entry.meta?.competition?.players?.sort(
            sortPlayers,
          ) ?? []) {
            const player = await Player.findByPk(meta.id);

            if (!player) {
              continue;
            }

            if (!entry.team) {
              throw new Error('Entry has no team');
            }

            data.push(
              this.getPlayerEntry(
                player,
                entry.team,
                meta?.single ?? 0,
                meta?.double ?? 0,
                meta?.mix ?? 0,
                subEvent.name,
                draw.name,
                subEvent.eventType == SubEventTypeEnum.MX,
                entry.meta?.competition?.teamIndex,
              ),
            );
          }
        }
      }
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

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

    XLSX.utils.book_append_sheet(wb, ws, 'Enrollment');

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { buffer, event };
  }

  private getPlayerEntry(
    player: Player,
    team: Team,
    single: number,
    double: number,
    mix: number,
    subEventName: string,
    drawName: string,
    mixed: boolean,
    teamIndex: number | undefined,
  ) {
    return [
      player.lastName,
      player.firstName,
      player.memberId,
      player.gender === 'M' ? 'M' : 'V',
      `${team.name} (${teamIndex})`,
      single,
      double,
      mix,
      subEventName,
      drawName.replace(subEventName, '').replace('-', '').trim(),
      mixed ? single + double + mix : '',
      mixed ? '' : single + double,
    ];
  }
}
