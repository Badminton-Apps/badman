import { Injectable, NotFoundException } from "@nestjs/common";
import {
  Club,
  EventCompetition,
  EventEntry,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import moment from "moment";

const DAY_NAMES: Readonly<Record<string, string>> = {
  monday: "Maandag",
  tuesday: "Dinsdag",
  wednesday: "Woensdag",
  thursday: "Donderdag",
  friday: "Vrijdag",
  saturday: "Zaterdag",
  sunday: "Zondag",
};

const HEADERS = [
  "Club ID",
  "Clubnaam",
  "Ploegnaam",
  "Voorkeur speelmoment (dag)",
  "Voorkeur speelmoment (tijdstip)",
] as const;

type ExportResult = {
  headers: typeof HEADERS;
  rows: (string | number | undefined | null)[][];
  eventName: string;
};

@Injectable()
export class TeamsService {
  async getTeams(eventId: string): Promise<ExportResult> {
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
          include: [{ model: Club }],
        },
      ],
    });

    const seen = new Set<string>();
    const rows: (string | number | undefined | null)[][] = [];

    for (const entry of entries) {
      const team = entry.team;
      if (!team || seen.has(team.id)) continue;
      seen.add(team.id);

      rows.push([
        team.club.clubId,
        team.club.name,
        team.name,
        DAY_NAMES[team.preferredDay] || "",
        team.preferredTime ? moment(team.preferredTime, "HH:mm:ss").format("HH:mm") : "",
      ]);
    }

    return { headers: HEADERS, rows, eventName: event.name };
  }
}
