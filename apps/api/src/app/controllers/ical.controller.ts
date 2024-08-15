import { Team, Location } from '@badman/backend-database';
import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ICalCalendar } from 'ical-generator';
import moment from 'moment';
import { Includeable } from 'sequelize';

@Controller('calendar')
export class CalendarController {
  @Get('team')
  async generateCalendarLink(
    @Query() query: { teamId: string; linkId: string },
    @Res() res: Response,
  ) {
    if (!query.teamId && !query.linkId) {
      return res.status(400).send('Invalid team or link id');
    }

    const team = query.teamId
      ? await Team.findByPk(query.teamId)
      : await Team.findOne({ where: { link: query.linkId } });

    if (!team) {
      return res.status(404).send('Team not found');
    }

    const include = [
      { model: Team, as: 'home' },
      { model: Team, as: 'away' },
      {
        model: Location,
        as: 'location',
      },
    ] as Includeable[];

    const encH = await team.getHomeEncounters({ include });
    const encA = await team.getAwayEncounters({ include });

    const events = [...encH, ...encA].map((enc) => ({
      title: `${enc.home.name} vs ${enc.away.name}`,
      startTime: enc.date,
      endTime: moment(enc.date).add(3, 'hours').toDate(),
      description: `${enc.home.name} vs ${enc.away.name}`,
      location: enc.location,
    }));

    const calendar = new ICalCalendar({
      name: team.name,
    });

    events.forEach((event) => {
      calendar.createEvent({
        start: event.startTime,
        end: event.endTime,
        summary: event.title,
        description: event.description,
        location: {
          title: event.location.name,
          address: event.location.address,
          // geo: {
          //   lat: event.location.coordinates.
          // }
        },
      });
    });

    res.header('Content-Type', 'text/calendar');
    res.header('Content-Disposition', 'attachment; filename="calendar.ics"');

    // Send the calendar data as an .ics file
    res.send(calendar.toString());
  }
}
