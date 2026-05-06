import { EventCompetition, Player, Team } from "@badman/backend-database";
import { SubEventTypeEnum, sortPlayers } from "@badman/utils";
import { toXlsx } from "@badman/backend-utils";
import { Injectable } from "@nestjs/common";

// A excel generation service
@Injectable()
export class ExcelService {
  async GetEnrollment(eventId: string) {
    const event = await EventCompetition.findByPk(eventId);
    const subEvents = await event?.getSubEventCompetitions({
      order: [
        ["eventType", "ASC"],
        ["level", "ASC"],
      ],
    });

    const headers = [
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
    const rows: (string | number | undefined)[][] = [];

    for (const subEvent of subEvents ?? []) {
      const draws = await subEvent?.getDrawCompetitions();

      for (const draw of draws ?? []) {
        const entries = await draw?.getEventEntries({
          include: [{ model: Team }],
          order: [["team", "name", "ASC"]],
        });
        for (const entry of entries) {
          for (const meta of entry.meta?.competition?.players?.sort(sortPlayers) ?? []) {
            const player = await Player.findByPk(meta.id);

            if (!player) {
              continue;
            }

            if (!entry.team) {
              throw new Error("Entry has no team");
            }

            rows.push(
              this.getPlayerEntry(
                player,
                entry.team,
                meta?.single ?? 0,
                meta?.double ?? 0,
                meta?.mix ?? 0,
                subEvent.name,
                draw.name,
                subEvent.eventType == SubEventTypeEnum.MX,
                entry.meta?.competition?.teamIndex
              )
            );
          }
        }
      }
    }

    const buffer = toXlsx("Enrollment", headers, rows);
    return { buffer, event };
  }

  private getPlayerEntry(
    player: Player,
    team: Team,
    single: number,
    double: number,
    mix: number,
    subEventName: string,
    drawName: string,
    mixed: boolean,
    teamIndex: number | undefined
  ) {
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
      mixed ? single + double + mix : "",
      mixed ? "" : single + double,
    ];
  }
}
