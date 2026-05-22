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
import { formatInTimeZone } from "date-fns-tz";

const BRUSSELS_TZ = "Europe/Brussels";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const HEADERS = ["Club ID", "Clubnaam", "Locatie", "Datum", "Velden"] as const;

type ExportResult = {
  headers: typeof HEADERS;
  rows: (string | number | undefined | null)[][];
  eventName: string;
};

@Injectable()
export class ExceptionsService {
  // Iterate Brussels calendar days between start and end (inclusive), independent of the
  // system timezone the runner happens to be in. Returns formatted dd/MM/yyyy strings directly.
  dateRangeToBelgianDays(start?: Date | string, end?: Date | string): string[] {
    if (!start) return [];
    const startDate = start instanceof Date ? start : new Date(start);
    const endDate = end ? (end instanceof Date ? end : new Date(end)) : startDate;

    // Anchor each input to noon UTC of its Brussels calendar day. Noon avoids DST-transition
    // edge cases (DST shifts happen at 01:00 UTC; noon is safely far from the boundary).
    const startBrusselsDay = formatInTimeZone(startDate, BRUSSELS_TZ, "yyyy-MM-dd");
    const endBrusselsDay = formatInTimeZone(endDate, BRUSSELS_TZ, "yyyy-MM-dd");
    const startAnchor = new Date(`${startBrusselsDay}T12:00:00Z`);
    const endAnchor = new Date(`${endBrusselsDay}T12:00:00Z`);

    const days: string[] = [];
    for (let t = startAnchor.getTime(); t <= endAnchor.getTime(); t += ONE_DAY_MS) {
      days.push(formatInTimeZone(new Date(t), BRUSSELS_TZ, "dd/MM/yyyy"));
    }
    return days;
  }

  formatBelgianDate(date: Date): string {
    return formatInTimeZone(date, BRUSSELS_TZ, "dd/MM/yyyy");
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
            this.dateRangeToBelgianDays(exception.start, exception.end).map((formattedDate) => ({
              club,
              location,
              exception,
              formattedDate,
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
