import { Availability, EventCompetition } from '@badman/backend-database';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  async getPlannerData(season: string) {
    const events = await EventCompetition.findAll({
      where: {
        season,
      },
    });

    const clubs: {
      [key: string]: {
        name?: string;
        locations?: {
          id: string;
          name?: string;
          address?: string;
          street?: string;
          streetNumber?: string;
          zip?: string;
          city?: string;
          country?: string;
          availability?: {
            id?: string;
            day?: string;
            time?: string;
          }[];
        }[];
        teams?: {
          id?: string;
          name?: string;
          event?: {
            id?: string;
            name?: string;
          };
          subEvent?: {
            id?: string;
            name?: string;
          };
          draw?: {
            id?: string;
            name?: string;
          };
          preferredDay?: string;
          preferredTime?: Date;
        }[];
      };
    } = {};

    for (const event of events) {
      const subEvent = await event.getSubEventCompetitions();
      for (const sub of subEvent) {
        const entries = await sub.getEventEntries();
        for (const entry of entries) {
          const team = await entry.getTeam();
          const draw = await entry.getDrawCompetition();

          if (!team?.clubId) {
            continue;
          }

          const teaminfo = {
            id: team?.id,
            name: team?.name,
            event: {
              id: event?.id,
              name: event?.name,
            },
            subEvent: {
              id: sub?.id,
              name: sub?.name,
            },
            draw: {
              id: draw?.id,
              name: draw?.name,
            },
            preferredDay: team.preferredDay,
            preferredTime: team.preferredTime,
          };

          if (!clubs[team.clubId]) {
            const club = await team.getClub();
            const locations = await club.getLocations({
              include: [{ model: Availability, where: { season} }],
            });
            clubs[team.clubId] = {
              name: club.name,
              locations: locations.map((l) => {
                return {
                  id: l.id,
                  name: l.name,
                  address: l.address,
                  street: l.street,
                  streetNumber: l.streetNumber,
                  postalcode: l.postalcode,
                  city: l.city,
                  state: l.state,
                  availabilities: [
                    l.availabilities?.map((a) => {
                      return {
                        id: a.id,
                        day: a.days?.filter((d) => d.day != null),
                        exceptions: a.exceptions?.filter((e) => e.courts != null),
                      };
                    }),
                  ],
                };
              }),
              teams: [teaminfo],
            };
          } else {
            clubs[team.clubId]?.teams?.push(teaminfo);
          }
        }
      }
    }

    return clubs;
  }
}
