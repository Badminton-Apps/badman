import { Club, EventCompetition, EventTournament, Player } from "@badman/backend-database";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Op, WhereOptions } from "sequelize";
import { ConfigType } from "@badman/utils";

@Injectable()
export class SearchService {
  private readonly like = Op.iLike;
  private readonly notLike = Op.notILike;

  constructor(private readonly configService: ConfigService<ConfigType>) {
    if (this.configService.get("DB_DIALECT") === "sqlite") {
      this.like = Op.like;
      this.notLike = Op.notLike;
    }
  }

  async search(query: string): Promise<(Player | Club | EventCompetition | EventTournament)[]> {
    const parts = this.getParts(query);

    if (parts.length === 0) {
      return [];
    }

    const results = await Promise.all([
      this.searchClubs(parts),
      this.searchPlayers(parts),
      this.searchCompetitionEvents(parts),
      this.searchTournamnetsEvents(parts),
    ]);

    return results.flat();
  }

  public getParts(query: string) {
    return (
      `${query}`
        ?.toLowerCase()
        ?.replace(/[;\\\\/:*?"<>|&',]/, " ")
        ?.split(" ")
        ?.map((r) => r.trim())
        ?.filter((r) => r?.length > 0)
        ?.filter((r) => (r ?? null) != null) ?? []
    );
  }

  async searchPlayers(parts: string[], queries: WhereOptions[] = []): Promise<Player[]> {
    if (parts.length === 0) {
      return [];
    }

    // Use LIKE for SQLite, ILIKE for PostgreSQL
    const likeOperator = this.configService.get("DB_DIALECT") === "sqlite" ? "LIKE" : "ILIKE";
    const notLikeOperator =
      this.configService.get("DB_DIALECT") === "sqlite" ? "NOT LIKE" : "NOT ILIKE";

    const searchConditionsSQL = parts
      .map(
        (_, index) =>
          `("firstName" ${likeOperator} :part${index} OR "lastName" ${likeOperator} :part${index} OR "memberId" ${likeOperator} :part${index})`
      )
      .join(" AND ");

    const sql = `
      SELECT * FROM "Players" 
      WHERE (${searchConditionsSQL})
        AND "memberId" IS NOT NULL 
        AND "memberId" != ''
        AND "memberId" ${notLikeOperator} '%unknown%'
      LIMIT 100
    `;

    // Create replacements object
    const replacements: { [key: string]: string } = {};
    parts.forEach((part, index) => {
      replacements[`part${index}`] = `%${part}%`;
    });

    const result = await Player.sequelize?.query(sql, {
      replacements,
      model: Player,
      mapToModel: true,
    });

    return result || [];
  }

  async searchCompetitionEvents(
    parts: string[],
    queries: WhereOptions[] = []
  ): Promise<EventCompetition[]> {
    for (const part of parts) {
      queries.push({
        [Op.or]: [{ name: { [this.like]: `%${part}%` } }],
      });
    }

    return await EventCompetition.findAll({
      order: [["season", "DESC"]],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  async searchTournamnetsEvents(
    parts: string[],
    queries: WhereOptions[] = []
  ): Promise<EventTournament[]> {
    for (const part of parts) {
      queries.push({
        [Op.or]: [{ name: { [this.like]: `%${part}%` } }],
      });
    }

    return await EventTournament.findAll({
      order: [["firstDay", "DESC"]],
      where: { [Op.and]: queries },
      limit: 100,
    });
  }

  async searchClubs(parts: string[], queries: WhereOptions[] = []): Promise<Club[]> {
    for (const part of parts) {
      queries.push({
        [Op.or]: [
          { name: { [this.like]: `%${part}%` } },
          { abbreviation: { [this.like]: `%${part}%` } },
        ],
      });
    }

    return await Club.findAll({
      where: { [Op.and]: queries },
      limit: 100,
    });
  }
}
