import {
  EncounterCompetition,
  Game,
  Player,
  DrawCompetition,
  SubEventCompetition,
  EventCompetition,
  Assembly,
  Team,
} from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class EnterScoresRepository {
  private readonly logger = new Logger(EnterScoresRepository.name);

  async getEncounterById(encounterId: string): Promise<EncounterCompetition | null> {
    this.logger.debug(`Fetching encounter with ID: ${encounterId}`);

    return await EncounterCompetition.findByPk(encounterId, {
      attributes: [
        "id",
        "visualCode",
        "shuttle",
        "startHour",
        "endHour",
        "homeTeamId",
        "awayTeamId",
      ],
      include: [
        {
          attributes: [
            "id",
            "visualCode",
            "order",
            "set1Team1",
            "set1Team2",
            "set2Team1",
            "set2Team2",
            "set3Team1",
            "set3Team2",
            "gameType",
            "winner",
          ],
          model: Game,
          include: [
            {
              attributes: ["id", "memberId", "gender", "firstName", "lastName"],
              model: Player,
            },
          ],
        },
        {
          attributes: ["id"],
          model: DrawCompetition,
          include: [
            {
              attributes: ["id"],
              model: SubEventCompetition,
              include: [
                {
                  attributes: ["id", "visualCode"],
                  model: EventCompetition,
                },
              ],
            },
          ],
        },
        {
          model: Player,
          as: "gameLeader",
        },
        {
          model: Assembly,
        },
        {
          model: Team,
          as: "home",
          attributes: ["id", "name", "type"],
        },
        {
          model: Team,
          as: "away",
          attributes: ["id", "name", "type"],
        },
      ],
    });
  }

  constructToernooiUrl(encounter: EncounterCompetition | null): string | undefined {
    if (!encounter) return undefined;

    const matchId = encounter.visualCode;
    const eventId = encounter.drawCompetition?.subEventCompetition?.eventCompetition?.visualCode;

    if (!matchId || !eventId) return undefined;

    return `https://www.toernooi.nl/sport/teammatch.aspx?id=${eventId}&match=${matchId}`;
  }
}
