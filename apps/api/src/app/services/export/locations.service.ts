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

const DAY_NAMES: Readonly<Record<string, string>> = {
  monday: "Maandag",
  tuesday: "Dinsdag",
  wednesday: "Woensdag",
  thursday: "Donderdag",
  friday: "Vrijdag",
  saturday: "Zaterdag",
  sunday: "Zondag",
};

const HEADERS = ["Club ID", "Clubnaam", "Locatie", "Adres", "Dag", "Aantal Velden"] as const;

type ExportResult = {
  headers: typeof HEADERS;
  rows: (string | number | undefined | null)[][];
  eventName: string;
};

@Injectable()
export class LocationsService {
  assembleAddress(location: Location): string {
    const parts = [
      location.street,
      location.streetNumber,
      location.postalcode,
      location.city,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : (location.address ?? "");
  }

  async getLocations(eventId: string): Promise<ExportResult> {
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
      return club.locations.flatMap((location) => {
        const address = this.assembleAddress(location);
        return location.availabilities.flatMap((availability) =>
          (availability.days ?? [])
            .filter((day) => day.courts)
            .map((day) => ({
              club,
              location,
              address,
              dayName: DAY_NAMES[day.day] ?? day.day,
              courts: day.courts,
            }))
        );
      });
    });

    const seen = new Set<string>();
    const rows = candidates
      .filter(({ club, location, dayName }) => {
        const key = `${club.clubId}|${location.name}|${dayName}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(
        ({ club, location, address, dayName, courts }) =>
          [club.clubId, club.name, location.name, address, dayName, courts] as (
            | string
            | number
            | undefined
            | null
          )[]
      );

    return { headers: HEADERS, rows, eventName: event.name };
  }
}
