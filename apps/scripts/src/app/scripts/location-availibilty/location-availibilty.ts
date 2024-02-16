import {
  Availability,
  Club,
  Location,
  DrawCompetition,
  EncounterCompetition,
  EventCompetition,
  SubEventCompetition,
  Team,
} from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';
import moment from 'moment';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class CreateLocationAvailibiltyRunner {
  private readonly logger = new Logger(CreateLocationAvailibiltyRunner.name);
  constructor(private _sequelize: Sequelize) {}

  async process() {
    const transaction = await this._sequelize.transaction();

    try {
      /*
    For all clubs with only one location, if multiple encounters happend on the same time, assume this was a day, 
      create a location availibilty for that location, for that time, for that day of the week

      and link all the encounters to that location availibilty
    */

      const seasons = [2022];

      for (const season of seasons) {
        this.logger.verbose(`Fixing availibilty for season ${season}`);

        const events = await EventCompetition.findAll({
          attributes: ['id'],
          where: {
            season,
            official: true,
          },
          include: [
            {
              model: SubEventCompetition,
              attributes: ['id'],
              include: [
                {
                  model: DrawCompetition,
                  attributes: ['id'],
                },
              ],
            },
          ],
          transaction,
        });

        this.logger.verbose(`Fixing availibilty for ${events.length} events`);

        const drawIds = events
          .map((event) => event.subEventCompetitions)
          .flat()
          .map((subEvent) => subEvent?.drawCompetitions)
          .flat()
          .map((draw) => draw?.id);

        this.logger.verbose(`Fixing availibilty for ${drawIds.length} draws`);

        const encountes = await EncounterCompetition.findAll({
          attributes: ['id', 'date'],
          where: {
            drawId: drawIds,
          },
          include: [
            {
              model: Team,
              as: 'home',
              attributes: ['id', 'clubId'],
              required: true,
            },
          ],
          transaction,
        });

        this.logger.verbose(`Fixing availibilty for ${encountes.length} encounters`);

        const clubIds = [
          ...new Set(
            encountes
              .map((encounter) => encounter?.home?.clubId)
              .filter((clubId) => clubId != null),
          ),
        ];

        const clubs = await Club.findAll({
          attributes: ['id'],
          where: {
            id: clubIds,
          },
          include: [
            {
              model: Location,
              required: true,
              attributes: ['id'],
              include: [
                {
                  model: Availability,
                  where: {
                    season: season,
                  },
                },
              ],
            },
          ],
          transaction,
        });

        this.logger.verbose(`Fixing availibilty for ${clubs.length} clubs`);

        for (const club of clubs) {
          // if more then one location, skip
          // if no locations, skip
          if ((club.locations?.length ?? 0) > 1 || club.locations?.length === 0) {
            continue;
          }

          // get all the encounters for this club
          const clubEncounters = encountes.filter(
            (encounter) => encounter?.home?.clubId === club.id,
          );

          // group enocuntesr by day of the week and time
          const groupedEncounters = clubEncounters.reduce(
            (acc, encounter) => {
              const day = moment(encounter.date).format('dddd').toLowerCase();
              const time = moment(encounter.date).format('HH:mm');
              const key = `${day}-${time}`;

              if (!acc[key]) {
                acc[key] = [];
              }

              acc[key].push(encounter);

              return acc;
            },
            {} as Record<string, EncounterCompetition[]>,
          );

          // if more then 3 encounters on the same day and time, assume this was a day, create a location availibilty for that location, for that time, for that day of the week
          for (const key in groupedEncounters) {
            if (groupedEncounters[key].length > 3) {
              const encounters = groupedEncounters[key];

              // get the location for this club
              const location = club.locations?.[0];

              if (!location) {
                this.logger.error(`No location for club ${club.id} ${club.name}`);
                continue;
              }

              // create a availibilty for this location if it does not exist
              if (location.availabilities?.length === 0) {
                const availability = new Availability({
                  season,
                  locationId: location.id,
                });
                await availability.save({
                  transaction,
                });

                await location.addAvailability(availability, {
                  transaction,
                });
              }

              // add the day to the availibilty
              const availability = location.availabilities?.[0];
              if (!availability) {
                this.logger.error(`No availibilty for location ${location.id} ${location.name}`);
                continue;
              }

              const day = moment(encounters[0].date).format('dddd').toLowerCase() as
                | 'monday'
                | 'tuesday'
                | 'wednesday'
                | 'thursday'
                | 'friday'
                | 'saturday'
                | 'sunday';
              const startTime = moment(encounters[0].date).format('HH:mm');

              const availibiltyDay = availability.days?.find(
                (d) => d.day === day && d.startTime === startTime,
              );

              if (!availibiltyDay) {
                availability.days?.push({
                  day,
                  startTime,
                });

                availability.changed('days', true);

                await availability.save({
                  transaction,
                });
              }

              // link all the encounters to this location availibilty
              for (const encounter of encounters) {
                encounter.locationId = location.id;
                await encounter.save({
                  transaction,
                });
              }
            }
          }
        }
      }

      await transaction.commit();

      this.logger.verbose(`Done`);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}
