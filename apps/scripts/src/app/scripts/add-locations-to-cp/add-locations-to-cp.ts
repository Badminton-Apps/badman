import {
  Club,
  EventCompetition,
  Location,
  Team,
} from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import xlsx from 'xlsx';
import { CpClub, CpLocation } from './clubs-locations';

@Injectable()
export class AddLocationsId {
  private readonly logger = new Logger(AddLocationsId.name);

  /*
  // await this.fixer.encountersWithLocations(
    //   '2625c52f-fae4-4a81-87ed-6819f44f1dcf',
    //   cpClubsVlaamse,
    //   cpLocationsVlaamse
    // );

    // await this.fixer.encountersWithLocations(
    //   '9d79c7bb-608d-4d32-964a-91def2b96ac2',
    //   cpClubsLimburg,
    //   cpLocationsLimburg
    // );

    // await this.fixer.encountersWithLocations(
    //   'd6f78a29-0c03-44f9-b2bc-81d5f79ff2f7',
    //   cpClubsVvbbc,
    //   cpLocationsVvbbc
    // );
     */

  public async encountersWithLocations(
    eventId: string,
    cpClubs: CpClub[],
    cplocations: CpLocation[]
  ) {
    const event = await EventCompetition.findByPk(eventId);

    const teamMatches = xlsx.readFile(
      `apps/scripts/src/app/scripts/add-locations-to-cp/exportteammatches391192 ${event?.name}.xlsx`
    );
    const teamMatchesSheet = teamMatches.Sheets[teamMatches.SheetNames[0]];
    const teamMatchesJson = xlsx.utils.sheet_to_json<{
      matchid: number;
      plannedtime: string;
      plannedtime_original: string;
      drawid: number;
      eventid: number;
      team1name: string;
      team2name: string;
    }>(teamMatchesSheet);

    const data: (string | number | boolean)[][] = [
      [
        'matchid',
        'Home Club',
        'Home Team',
        'Away Team',
        'Datum',
        'Locatie ontmoeting',
        '',
        '',
        '',
        'Locatie Club 1',
        'Locatie Club 2',
        'Locatie Club 3',
      ],
    ];

    const subEvents = await event?.getSubEventCompetitions();

    for (const teamMatch of teamMatchesJson) {
      const subEvent = subEvents?.find(
        (e) => e.visualCode === `${teamMatch.eventid}`
      );

      const draw = await subEvent?.getDrawCompetitions({
        where: {
          visualCode: `${teamMatch.drawid}`,
        },
      });

      if (!draw || draw.length === 0) {
        this.logger.warn(`Draw not found ${teamMatch.drawid}`);
        continue;
      }

      const encounter = await draw[0].getEncounterCompetitions({
        where: {
          visualCode: `${teamMatch.matchid}`,
        },
        include: [
          {
            model: Team,
            as: 'home',
            include: [
              {
                model: Club,
                include: [
                  {
                    model: Location,
                  },
                ],
              },
            ],
          },
          { model: Team, as: 'away' },
        ],
      });

      if (!encounter || encounter.length === 0) {
        this.logger.warn(`Encounter not found ${teamMatch.matchid}`);
        data.push(this.get_row(teamMatch));
        continue;
      }

      const home = encounter[0].home;
      const away = encounter[0].away;

      if (!teamMatch.team1name.includes(home?.name ?? '')) {
        this.logger.warn(`Home team not found ${teamMatch.team1name}`);
        data.push(this.get_row(teamMatch));
      }

      if (!teamMatch.team2name.includes(away?.name ?? '')) {
        this.logger.warn(`Home team not found ${teamMatch.team2name}`);
        data.push(this.get_row(teamMatch, home));
      }

      const cpClub = cpClubs.find((c) => c.clubid == home?.club?.clubId);

      if (!cpClub) {
        this.logger.warn(`Club not found ${home?.club?.clubId}`);
        data.push(this.get_row(teamMatch, home));

        continue;
      }
      // parse teamMatch planned time as 'DD-MM-YYYY HH:MM:ss
      const plannedTime = moment(teamMatch.plannedtime, 'DD-MM-YYYY HH:mm:ss');

      if (!plannedTime.isSame(encounter[0].date, 'minute')) {
        this.logger.warn(
          `Planned is not the same ${teamMatch.plannedtime} - ${encounter[0].date}`
        );
      }

      const locationsForClub = cplocations.filter(
        (l) => l.clubid == cpClub?.id
      );

      let usedLocationId: number | undefined = undefined;

      if (!locationsForClub || locationsForClub.length === 0) {
        this.logger.warn(`No locations for club ${home?.club?.name}`);
        data.push(this.get_row(teamMatch, home));
        continue;
      }

      if (locationsForClub.length == 1) {
        usedLocationId = locationsForClub[0].id;
      } else {
        const location = await encounter[0].getLocation();

        // find if any have the same name
        const locationForClub = locationsForClub.find(
          (l) => l.name === location?.name
        );

        if (locationForClub) {
          usedLocationId = locationForClub.id;
        } else {
          this.logger.warn(
            `No location found for club ${home?.club?.name} and encounter ${encounter[0].id}`
          );
        }
      }

      if (!usedLocationId) {
        this.logger.warn(
          `No location found for club ${home?.club?.name} and encounter ${encounter[0].id}`
        );
      }

      data.push(
        this.get_row(
          teamMatch,
          home || null,
          cplocations?.find((l) => l.id == usedLocationId)?.name,
          home?.club?.locations || []
        )
      );
    }

    const ws = xlsx.utils.aoa_to_sheet(data);
    const wb = xlsx.utils.book_new();

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
        0
      )
    );
    ws['!cols'] = columnSizes.map((width) => ({ width }));

    // Enable filtering
    ws['!autofilter'] = {
      ref: xlsx.utils.encode_range(
        xlsx.utils.decode_range(ws['!ref'] as string)
      ),
    };

    xlsx.utils.book_append_sheet(wb, ws, 'Encounter Data na sync');
    const fileName = `apps/scripts/src/app/scripts/add-locations-to-cp/export-encounters-and-locations-${event?.name}.xlsx`;
    xlsx.writeFile(wb, fileName);
  }

  private get_row(
    teamMatch: {
      matchid: number;
      plannedtime: string;
      plannedtime_original: string;
      drawid: number;
      eventid: number;
      team1name: string;
      team2name: string;
    },

    home?: Team | null,
    locationName?: string | undefined,
    clubLocations?: Location[]
  ) {
    return [
      teamMatch.matchid,
      home?.club?.name || '',
      teamMatch.team1name || '',
      teamMatch.team2name || '',
      teamMatch.plannedtime || '',
      locationName || '',
      '',
      '',
      '',
      ...(clubLocations?.map((l) => l.name || '') ?? []),
    ];
  }
}
