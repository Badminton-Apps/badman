import { Club, EventEntry, Logging, Player, Team } from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Transaction } from "sequelize";
import { LoggingAction } from "@badman/utils";
import { ErrorCode } from "../../utils";

export interface FinalizeArgs {
  clubId: string;
  season: number;
  email: string;
  user: Player;
  club: Club;
  transaction: Transaction;
}

export interface FinalizeResult {
  alreadyFinalised: boolean;
}

@Injectable()
export class EnrollmentFinalizeService {
  private readonly logger = new Logger(EnrollmentFinalizeService.name);

  async finalize({
    clubId,
    season,
    email,
    user,
    club,
    transaction,
  }: FinalizeArgs): Promise<FinalizeResult> {
    const teams = await Team.findAll({
      where: { clubId, season },
      include: [{ model: EventEntry }],
      transaction,
    });

    if (teams.length === 0) {
      throw new GraphQLError("No teams to finalise for this club and season", {
        extensions: { code: ErrorCode.NO_TEAMS_TO_FINALISE, clubId, season },
      });
    }

    const teamIds = teams.filter((t) => t.entry).map((t) => t.id);

    const entries = await EventEntry.findAll({
      where: { teamId: teamIds },
      lock: transaction.LOCK.UPDATE,
      transaction,
    });

    const alreadyFinalised =
      entries.length > 0 && entries.every((e) => e.sendOn !== null && e.sendOn !== undefined);

    if (club.contactCompetition !== email) {
      club.contactCompetition = email;
      await club.save({ transaction });
    }

    if (alreadyFinalised) {
      return { alreadyFinalised: true };
    }

    for (const team of teams) {
      if (!team.entry) continue;
      if (team.entry.sendOn === null || team.entry.sendOn === undefined) {
        team.entry.sendOn = new Date();
        await team.entry.save({ transaction });
      }
    }

    await Logging.create(
      {
        action: LoggingAction.EnrollmentSubmitted,
        playerId: user.id,
        meta: { clubId, season, email },
      },
      { transaction }
    );

    return { alreadyFinalised: false };
  }
}
