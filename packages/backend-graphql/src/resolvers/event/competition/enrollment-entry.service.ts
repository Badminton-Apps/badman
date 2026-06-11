import {
  EntryCompetitionPlayer,
  EventCompetition,
  EventEntry,
  Player,
  SubEventCompetition,
  Team,
} from "@badman/backend-database";
import { IndexCalculationService, isFailure } from "@badman/backend-enrollment";
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

  constructor(private readonly indexCalculationService: IndexCalculationService) {}

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
      const diagnostic = {
        code: ErrorCode.SEASON_MISMATCH,
        userId,
        teamId,
        teamName: team.name,
        teamClubId: team.clubId,
        teamType: team.type,
        teamSeason: team.season,
        subEventCompetitionId: subEventId,
        subEventName: subEvent.name,
        subEventType: subEvent.eventType,
        eventCompetitionId: subEvent.eventCompetition?.id ?? null,
        eventCompetitionName: subEvent.eventCompetition?.name ?? null,
        competitionSeason: competitionSeason ?? null,
        basePlayersCount: basePlayers?.length ?? 0,
      };
      this.logger.error(
        `SEASON_MISMATCH: team ${teamId} (season=${team.season}) vs competition ${subEvent.eventCompetition?.id} (season=${competitionSeason})`,
        diagnostic
      );
      throw new GraphQLError("Team season does not match competition season.", {
        extensions: {
          code: ErrorCode.SEASON_MISMATCH,
          teamId,
          teamSeason: team.season,
          subEventCompetitionId: subEventId,
          eventCompetitionId: subEvent.eventCompetition?.id ?? null,
          competitionSeason,
        },
      });
    }

    const existingEntry = await team.getEntry({ transaction });
    const alreadyExisted = existingEntry?.subEventId === subEventId;

    const entry = existingEntry ?? (await EventEntry.create({}, { transaction }));

    if (basePlayers.length > 0) {
      const result = await this.indexCalculationService.calculateOne(
        {
          key: entry.id as string,
          type: team.type,
          subEventCompetitionId: subEventId,
          players: basePlayers.map((id) => ({ id })),
        },
        { transaction, caller: "EnrollmentEntryService.createEntry" }
      );

      if (isFailure(result)) {
        throw new GraphQLError(result.error.message, {
          extensions: {
            code:
              result.error.code === "PLAYER_NOT_FOUND"
                ? ErrorCode.PLAYER_NOT_FOUND
                : ErrorCode.INTERNAL_ERROR,
            ...(result.error.playerIds ? { playerIds: result.error.playerIds } : {}),
          },
        });
      }

      const competitionBasePlayers: EntryCompetitionPlayer[] = result.resolvedPlayers.map((rp) => ({
        id: rp.id,
        gender: rp.gender ?? undefined,
        single: rp.single,
        double: rp.double,
        mix: rp.mix,
        levelException: false,
        levelExceptionRequested: false,
      }));

      entry.meta = {
        ...entry.meta,
        competition: { teamIndex: result.index, players: competitionBasePlayers },
      };
      await entry.save({ transaction, hooks: false });
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
