import { Club, EventCompetition, EventTournament, Player } from "@badman/backend-database";
import { createSearchCondition } from "@badman/backend-utils";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ConfigType } from "@badman/utils";

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly configService: ConfigService<ConfigType>) {}

  async search(query: string): Promise<(Player | Club | EventCompetition | EventTournament)[]> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return [];
    }

    const results = await Promise.all([
      this.searchClubs(query),
      this.searchPlayers(query),
      this.searchCompetitionEvents(query),
      this.searchTournamnetsEvents(query),
    ]);

    return results.flat();
  }

  async searchPlayers(query: string): Promise<Player[]> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return [];
    }

    const likeOperator = this.configService.get("DB_DIALECT") === "sqlite" ? "LIKE" : "ILIKE";
    const notLikeOperator =
      this.configService.get("DB_DIALECT") === "sqlite" ? "NOT LIKE" : "NOT ILIKE";

    const { condition: searchConditionsSQL, replacements } = createSearchCondition(
      query,
      ["firstName", "lastName", "memberId"],
      likeOperator
    );

    if (!searchConditionsSQL) {
      return [];
    }

    const sql = `
      SELECT * FROM "${Player.schema.name || "public"}"."${Player.tableName}" 
      WHERE (${searchConditionsSQL})
        AND "memberId" IS NOT NULL 
        AND "memberId" != ''
        AND "memberId" ${notLikeOperator} '%unknown%'
      LIMIT 100
    `;

    const result = await Player.sequelize?.query(sql, {
      replacements,
      model: Player,
      mapToModel: true,
    });

    return result || [];
  }

  async searchCompetitionEvents(query: string): Promise<EventCompetition[]> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return [];
    }

    const likeOperator = this.configService.get("DB_DIALECT") === "sqlite" ? "LIKE" : "ILIKE";
    const { condition: searchConditionsSQL, replacements } = createSearchCondition(
      query,
      ["name"],
      likeOperator
    );

    if (!searchConditionsSQL) {
      return [];
    }

    const sql = `
      SELECT * FROM "${EventCompetition.options.schema || "public"}"."${EventCompetition.tableName}" 
      WHERE ${searchConditionsSQL}
      ORDER BY "season" DESC
      LIMIT 100
    `;

    const result = await EventCompetition.sequelize?.query(sql, {
      replacements,
      model: EventCompetition,
      mapToModel: true,
    });

    return result || [];
  }

  async searchTournamnetsEvents(query: string): Promise<EventTournament[]> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return [];
    }

    const likeOperator = this.configService.get("DB_DIALECT") === "sqlite" ? "LIKE" : "ILIKE";
    const { condition: searchConditionsSQL, replacements } = createSearchCondition(
      query,
      ["name"],
      likeOperator
    );

    if (!searchConditionsSQL) {
      return [];
    }

    const sql = `
      SELECT * FROM "${EventTournament.options.schema || "public"}"."${EventTournament.tableName}" 
      WHERE ${searchConditionsSQL}
      ORDER BY "firstDay" DESC
      LIMIT 100
    `;

    const result = await EventTournament.sequelize?.query(sql, {
      replacements,
      model: EventTournament,
      mapToModel: true,
    });

    return result || [];
  }

  async searchClubs(query: string): Promise<Club[]> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return [];
    }

    const likeOperator = this.configService.get("DB_DIALECT") === "sqlite" ? "LIKE" : "ILIKE";
    const { condition: searchConditionsSQL, replacements } = createSearchCondition(
      query,
      ["name", "abbreviation"],
      likeOperator
    );

    if (!searchConditionsSQL) {
      return [];
    }

    const sql = `
      SELECT * FROM "${Club.options.schema || "public"}"."${Club.tableName}" 
      WHERE ${searchConditionsSQL}
      LIMIT 100
    `;

    const result = await Club.sequelize?.query(sql, {
      replacements,
      model: Club,
      mapToModel: true,
    });

    return result || [];
  }
}
