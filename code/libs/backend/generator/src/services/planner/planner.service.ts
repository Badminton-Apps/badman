import { Availability, EventCompetition } from '@badman/backend/database';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  async getPlannerData(year: string) {
    const events = await EventCompetition.findAll({
      where: {
        startYear: year,
      },
    });

    const clubs = {};

    for (const event of events) {
      const subEvent = await event.getSubEventCompetitions();
      for (const sub of subEvent) {
        const entries = await sub.getEventEntries();
        for (const entry of entries) {
          const team = await entry.getTeam();
          const draw = await entry.getCompetitionDraw();

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
              include: [{ model: Availability, where: { year } }],
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
                    l.availabilities.map((a) => {
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
            clubs[team.clubId].teams.push(teaminfo);
          }
        }
      }
    }

    return clubs;
  }
}
