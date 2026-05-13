import {
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { Injectable, Logger } from "@nestjs/common";
import { GraphQLError } from "graphql";
import { Transaction } from "sequelize";
import { ErrorCode } from "../../../utils";

interface CreateEntryArgs {
  teamId: string;
  subEventId: string;
  basePlayers: string[];
  transaction: Transaction;
  user: Player;
}

export interface CreateEntryResult {
  teamId: string;
  entryId: string;
  subEventCompetitionId: string;
  alreadyExisted: boolean;
}

@Injectable()
export class EnrollmentEntryService {
  private readonly logger = new Logger(EnrollmentEntryService.name);

  async createEntry({
    teamId,
    subEventId,
    basePlayers,
    transaction,
    user,
  }: CreateEntryArgs): Promise<CreateEntryResult> {
    const userId = user?.id ?? null;

    const team = await Team.findByPk(teamId, { transaction });
    if (!team) {
      this.logger.warn({
        code: ErrorCode.TEAM_NOT_FOUND,
        teamId,
        subEventCompetitionId: subEventId,
        userId,
      });
      throw new GraphQLError(`Team not found: ${teamId}`, {
        extensions: { code: ErrorCode.TEAM_NOT_FOUND, teamId },
      });
    }

    const allowed = await user.hasAnyPermission([
      "edit:competition",
      `${team.clubId}_edit:club`,
      "edit-any:club",
    ]);
    if (!allowed) {
      this.logger.warn({
        code: ErrorCode.PERMISSION_DENIED,
        teamId,
        subEventCompetitionId: subEventId,
        userId,
      });
      throw new GraphQLError("You do not have permission to enroll this team.", {
        extensions: { code: ErrorCode.PERMISSION_DENIED, userId },
      });
    }

    const subEvent = await SubEventCompetition.findByPk(subEventId, {
      transaction,
      include: [EventCompetition],
    });
    if (!subEvent) {
      this.logger.warn({
        code: ErrorCode.SUB_EVENT_NOT_FOUND,
        teamId,
        subEventCompetitionId: subEventId,
        userId,
      });
      throw new GraphQLError(`Sub-event not found: ${subEventId}`, {
        extensions: { code: ErrorCode.SUB_EVENT_NOT_FOUND, subEventId },
      });
    }

    const competitionSeason = subEvent.eventCompetition?.season;
    if (team.season !== competitionSeason) {
      this.logger.warn({
        code: ErrorCode.SEASON_MISMATCH,
        teamId,
        subEventCompetitionId: subEventId,
        userId,
        teamSeason: team.season,
        competitionSeason,
      });
      throw new GraphQLError("Team season does not match competition season.", {
        extensions: { code: ErrorCode.SEASON_MISMATCH, teamSeason: team.season, competitionSeason },
      });
    }

    const existingEntry = await team.getEntry({ transaction });
    const alreadyExisted = existingEntry?.subEventId === subEventId;

    const entry =
      existingEntry ??
      (await EventEntry.create(
        basePlayers.length > 0
          ? { meta: { competition: { players: basePlayers.map((id) => ({ id })) } } }
          : {},
        { transaction }
      ));

    if (basePlayers.length > 0 && existingEntry) {
      entry.meta = {
        ...entry.meta,
        competition: {
          ...entry.meta?.competition,
          players: basePlayers.map((id) => ({ id })),
        },
      };
      await entry.save({ transaction });
    }

    if (!alreadyExisted) {
      await team.setEntry(entry, { transaction });
      await subEvent.addEventEntry(entry, { transaction });
    }

    return {
      teamId,
      entryId: entry.id as string,
      subEventCompetitionId: subEventId,
      alreadyExisted,
    };
  }
}
