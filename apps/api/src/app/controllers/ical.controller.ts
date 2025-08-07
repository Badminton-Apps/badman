import { EncounterCompetition, Location, Team } from "@badman/backend-database";
import { Controller, Get, Query, Res } from "@nestjs/common";
import { Response } from "express";
import { ICalCalendar } from "ical-generator";
import moment from "moment";
import { Op } from "sequelize";

@Controller("calendar")
export class CalendarController {
  @Get("team")
  async generateCalendarLink(
    @Query() query: { teamId: string; linkId: string },
    @Res() res: Response
  ) {
    if (!query.teamId && !query.linkId) {
      return res.status(400).send("Invalid team or link id");
    }

    const team = query.teamId
      ? await Team.findByPk(query.teamId)
      : await Team.findAll({ where: { link: query.linkId } });

    if (!team) {
      return res.status(404).send("Team not found");
    }

    const ids = Array.isArray(team) ? team.map((t) => t.id) : [team.id];
    const teamName = Array.isArray(team) ? team[0].name : team.name;

    const encounters = await EncounterCompetition.findAll({
      where: {
        [Op.or]: [{ homeTeamId: ids }, { awayTeamId: ids }],
      },
      include: [
        {
          model: Location,
          as: "location",
        },
        {
          model: Team,
          as: "home",
        },
        {
          model: Team,
          as: "away",
        },
      ],
    });

    console.log(`found ${encounters.length} encounters`);

    const events = encounters.map((enc) => ({
      title: `${enc.home.name} vs ${enc.away.name}`,
      startTime: enc.date,
      endTime: moment(enc.date).add(3, "hours").toDate(),
      description: `${enc.home.name} vs ${enc.away.name} on ${moment(enc.date).format("DD/MM/YYYY")}`,
      location: enc.location,
    }));

    const calendar = new ICalCalendar({
      name: teamName,
    });

    events.forEach((event) => {
      calendar.createEvent({
        timezone: "Europe/Brussels",
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

    // res.header('Content-Type', 'text/calendar');
    // res.header('Content-Disposition', `attachment; filename="calendar-${teamName}.ics"`);

    // Send the calendar data as an .ics file
    res.send(calendar.toString());
  }
}
