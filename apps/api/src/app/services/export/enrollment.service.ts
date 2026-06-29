import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  DrawCompetition,
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { SubEventTypeEnum, sortPlayers } from "@badman/utils";

const HEADERS = [
  "Naam",
  "Voornaam",
  "Lidnummer",
  "Geslacht",
  "Ploeg",
  "Enkel",
  "Dubbel",
  "Gemengd",
  "Afdeling",
  "Reeks",
  "Somindex gemengde competitie",
  "Somindex heren-/damescompetitie",
] as const;

type ExportResult = {
  headers: typeof HEADERS;
  rows: (string | number | undefined | null)[][];
  eventName: string;
};

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);

  async getEnrollment(eventId: string): Promise<ExportResult> {
    const event = await EventCompetition.findByPk(eventId);
    if (!event) {
      throw new NotFoundException(`EventCompetition ${eventId} not found`);
    }

    const subEvents = await event.getSubEventCompetitions({
      order: [
        ["eventType", "ASC"],
        ["level", "ASC"],
      ],
    });

    // Collect all player IDs across all entries for bulk resolution.
    // Entries are fetched via subEventId (always set at enrollment time).
    // drawCompetition is included to populate the Reeks column when the entry
    // has been assigned to a draw; entries not yet assigned get an empty Reeks.
    const allPlayerIds: string[] = [];
    const allEntries: {
      subEvent: SubEventCompetition;
      entry: EventEntry;
    }[] = [];

    for (const subEvent of subEvents) {
      const entries = await subEvent.getEventEntries({
        include: [{ model: Team }, { model: DrawCompetition }],
        order: [["team", "name", "ASC"]],
      });
      for (const entry of entries) {
        for (const meta of entry.meta?.competition?.players ?? []) {
          if (meta.id) allPlayerIds.push(meta.id);
        }
        allEntries.push({ subEvent, entry });
      }
    }

    // Single bulk query for all players
    const players = await Player.findAll({ where: { id: allPlayerIds } });
    const playerMap = new Map(players.map((player) => [player.id, player]));

    const rows: (string | number | undefined | null)[][] = [];

    for (const { subEvent, entry } of allEntries) {
      if (!entry.team) {
        this.logger.warn(`Entry ${entry.id} has no team — skipping`);
        continue;
      }

      const drawName = entry.drawCompetition?.name ?? "";

      for (const meta of (entry.meta?.competition?.players ?? []).sort(sortPlayers)) {
        if (!meta.id) continue;
        const player = playerMap.get(meta.id);
        if (!player) continue;

        const isMixed = subEvent.eventType === SubEventTypeEnum.MX;
        rows.push(
          this.getPlayerEntry(
            player,
            entry.team,
            meta.single ?? 0,
            meta.double ?? 0,
            meta.mix ?? 0,
            subEvent.name,
            drawName,
            isMixed,
            entry.meta?.competition?.teamIndex
          )
        );
      }
    }

    return { headers: HEADERS, rows, eventName: event.name };
  }

  private getPlayerEntry(
    player: Player,
    team: Team,
    single: number,
    double: number,
    mix: number,
    subEventName: string,
    drawName: string,
    isMixed: boolean,
    teamIndex: number | undefined
  ): (string | number | undefined | null)[] {
    return [
      player.lastName,
      player.firstName,
      player.memberId,
      player.gender === "M" ? "M" : "V",
      `${team.name} (${teamIndex})`,
      single,
      double,
      mix,
      subEventName,
      drawName.replace(subEventName, "").replace("-", "").trim(),
      isMixed ? single + double + mix : "",
      isMixed ? "" : single + double,
    ];
  }
}
