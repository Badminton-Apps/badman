import {
  Availability,
  Club,
  EventCompetition,
  Location,
  Team,
} from '@badman/backend-database';
import { runParallel } from '@badman/utils';
import { Logger } from '@nestjs/common';
import moment from 'moment';
import { StepOptions, StepProcessor } from '../../../../processing';
import { EncounterStepData } from './encounter';

export class CompetitionSyncEncounterLocationProcessor extends StepProcessor {
  public event?: EventCompetition;
  public encounters?: EncounterStepData[];

  constructor(options?: StepOptions) {
    if (!options) {
      options = {};
    }
    options.logger =
      options.logger ||
      new Logger(CompetitionSyncEncounterLocationProcessor.name);
    super(options);
  }

  public async process(): Promise<void> {
    if (!this.encounters) {
      return;
    }

    if (!this.event?.season) {
      throw new Error('No event');
    }

    const teamIds = this.encounters
      .map((encounter) => encounter.encounter.homeTeamId ?? null)
      .filter((id) => id !== null) as string[];

    const teams = await Team.findAll({
      where: {
        id: teamIds,
      },
      transaction: this.transaction,
    });

    // get the encounters grouped by encounter.home?.clubId
    const clubEncounterMap = this.encounters
      ?.filter((e) => e.encounter.locationId == null)
      ?.reduce((acc, encounter) => {
        const team = teams.find(
          (team) => team.id === encounter.encounter.homeTeamId
        );
        const clubId = team?.clubId;
        if (!clubId) {
          return acc;
        }

        if (!acc[clubId]) {
          acc[clubId] = [];
        }

        acc[clubId].push(encounter);

        return acc;
      }, {} as Record<string, EncounterStepData[]>);

    // get all the clubs
    const clubs = await Club.findAll({
      where: {
        id: Object.keys(clubEncounterMap),
      },
      include: [
        {
          model: Location,
          include: [
            {
              model: Availability,
              where: {
                season: this.event.season,
              },
            },
          ],
        },
      ],
      transaction: this.transaction,
    });

    await runParallel(
      clubs.map((club) =>
        this._processEncountersForClub(clubEncounterMap[club.id] ?? [], club)
      )
    );
  }

  private async _processEncountersForClub(
    encounters: EncounterStepData[],
    club: Club
  ) {
    // for each encounter, check if the location is not set
    for (const encounter of encounters) {
      if (encounter.encounter.locationId) {
        continue;
      }

      // get the location for the club
      const locations = club.locations?.filter(
        (location) => location.availabilities?.length
      );

      if (!locations || !locations.length) {
        this.logger.warn(
          `No locations found for club ${club.id} for encounter ${encounter.encounter.id}`
        );
        continue;
      }

      // if there is only one location, set it
      if (locations.length === 1) {
        encounter.encounter.locationId = locations[0].id;
        await encounter.encounter.save({ transaction: this.transaction });
        continue;
      }

      const momentdate = moment(encounter.encounter.date);

      const options = [];
      for (const location of locations) {
        for (const availability of location.availabilities ?? []) {
          if (!availability.days) {
            continue;
          }

          for (const day of availability.days) {
            //  check if the day is the same as the encounter as monday, tuesday, etc
            if (day.day === momentdate.format('dddd').toLowerCase()) {
              // Clone the momentdate so we can set the time on it
              const startTime = momentdate.clone().set({
                hour: moment(day.startTime, 'HH:mm').hour(),
                minute: moment(day.startTime, 'HH:mm').minute(),
              });

              this.logger.debug(
                `Checing if date ${momentdate.format(
                  'YYYY-MM-DD HH:mm'
                )} is between ${startTime
                  .clone()
                  .subtract(15, 'minutes')
                  .format('YYYY-MM-DD HH:mm')} and ${startTime
                  .clone()
                  .add(15, 'minutes')
                  .format('YYYY-MM-DD HH:mm')}`
              );

              // check if the start time is whithin a 15 minute range of the encounter start time
              if (
                momentdate.isBetween(
                  startTime.clone().subtract(15, 'minutes'),
                  startTime.clone().add(15, 'minutes')
                )
              ) {
                options.push(location);
              }
            }
          }
        }
      }

      if (options.length === 1) {
        encounter.encounter.locationId = options[0].id;
        await encounter.encounter.save({ transaction: this.transaction });
      }

      // if there are multiple locations, print a warning and pick the first
      if (options.length > 1) {
        this.logger.warn(
          `Multiple locations found for encounter ${encounter.encounter.id}`
        );
        encounter.encounter.locationId = options[0].id;
        await encounter.encounter.save({ transaction: this.transaction });
      }
    }
  }
}
