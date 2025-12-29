import { EventEntry, Team } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";
import { Sequelize } from "sequelize-typescript";

@Injectable()
export class RecalculateEntryIndexService {
  private readonly logger = new Logger(RecalculateEntryIndexService.name);

  constructor(private _sequelize: Sequelize) {}

  async recalculateForTeam(teamId: string) {
    if (!teamId) {
      throw new Error("Team ID is required. Set TEAM_ID environment variable.");
    }

    const transaction = await this._sequelize.transaction();

    try {
      this.logger.log(`Looking for team: ${teamId}`);

      const team = await Team.findByPk(teamId, {
        transaction,
      });

      if (!team) {
        throw new Error(`Team not found: ${teamId}`);
      }

      this.logger.log(`Found team: ${team.name} (season: ${team.season})`);

      const entry = await EventEntry.findOne({
        where: {
          teamId: team.id,
        },
        transaction,
      });

      if (!entry) {
        throw new Error(`Entry not found for team: ${team.name} (${teamId})`);
      }

      // Set rankings to -1 so the hook will recalculate them from usedRankingDate
      if (entry.meta?.competition?.players) {
        entry.meta = {
          ...entry.meta,
          competition: {
            ...entry.meta.competition,
            players: entry.meta.competition.players.map((player) => ({
              ...player,
              single: -1,
              double: -1,
              mix: -1,
            })),
          },
        };
      }

      // Mark meta as changed to trigger the BeforeUpdate hook
      entry.changed("meta", true);

      await entry.save({ transaction });

      // Reload to get the updated values
      await entry.reload({ transaction });

      this.logger.log(`New teamIndex: ${entry.meta?.competition?.teamIndex}`);

      await transaction.commit();
      this.logger.log("Done!");
    } catch (e) {
      await transaction.rollback();
      this.logger.error(`Error: ${e}`);
      throw e;
    }
  }
}
