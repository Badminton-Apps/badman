import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Availability,
  Club,
  EventCompetition,
  EventEntry,
  Location,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { eachDayOfInterval } from "date-fns";
import { format, toZonedTime } from "date-fns-tz";

const BRUSSELS_TZ = "Europe/Brussels";

const HEADERS = ["Club ID", "Clubnaam", "Locatie", "Datum", "Velden"] as const;

type ExportResult = {
  headers: typeof HEADERS;
  rows: (string | number | undefined | null)[][];
  eventName: string;
};

@Injectable()
export class ExceptionsService {
  dateRangeToDays(start?: Date | string, end?: Date | string): Date[] {
    if (!start) return [];
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end ? (end instanceof Date ? end : new Date(end)) : startDate;
    return eachDayOfInterval({ start: startDate, end: endDate });
  }

  formatBelgianDate(date: Date): string {
    return format(toZonedTime(date, BRUSSELS_TZ), "dd/MM/yyyy", { timeZone: BRUSSELS_TZ });
  }

  async getExceptions(eventId: string): Promise<ExportResult> {
    const event = await EventCompetition.findByPk(eventId);
    if (!event) {
      throw new NotFoundException(`EventCompetition ${eventId} not found`);
    }

    const entries = await EventEntry.findAll({
      include: [
        {
          model: SubEventCompetition,
          attributes: [],
          where: { eventId },
          required: true,
        },
        {
          model: Team,
          required: false,
          include: [
            {
              model: Club,
              include: [
                {
                  model: Location,
                  include: [{ model: Availability }],
                },
              ],
            },
          ],
        },
      ],
    });

    const candidates = entries.flatMap((entry) => {
      const club = entry.team?.club;
      if (!club) return [];
      return club.locations.flatMap((location) =>
        location.availabilities.flatMap((availability) =>
          (availability.exceptions ?? []).flatMap((exception) =>
            this.dateRangeToDays(exception.start, exception.end).map((day) => ({
              club,
              location,
              exception,
              formattedDate: this.formatBelgianDate(day),
            }))
          )
        )
      );
    });

    const seen = new Set<string>();
    const rows = candidates
      .filter(({ club, location, formattedDate }) => {
        const key = `${club.clubId}|${location.name}|${formattedDate}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(
        ({ club, location, exception, formattedDate }) =>
          [club.clubId, club.name, location.name, formattedDate, exception.courts ?? ""] as (
            | string
            | number
            | undefined
            | null
          )[]
      );

    return { headers: HEADERS, rows, eventName: event.name };
  }
}
