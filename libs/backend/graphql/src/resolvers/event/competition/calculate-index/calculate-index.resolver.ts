import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import { IndexCalculationService, isFailure, isSuccess } from "@badman/backend-enrollment";
import { IsUUID } from "@badman/utils";
import { Logger } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { GraphQLError } from "graphql";
import { ErrorCode } from "../../../../utils";
import { CalculateIndexInput } from "./calculate-index.input";
import { CalculateIndexResult } from "./calculate-index.result";

@Resolver(() => CalculateIndexResult)
export class CalculateIndexResolver {
  private readonly logger = new Logger(CalculateIndexResolver.name);

  constructor(private readonly indexCalculationService: IndexCalculationService) {}

  @Query(() => [CalculateIndexResult], {
    description:
      "Calculate team-strength index for a batch of inputs. Requires authentication. " +
      "Failures surface as GraphQLError with a stable extensions.code " +
      "(PLAYER_NOT_FOUND, SUB_EVENT_NOT_FOUND, RANKING_SYSTEM_NOT_FOUND, INTERNAL_ERROR).",
  })
  async calculateIndex(
    @Args({ name: "inputs", type: () => [CalculateIndexInput] }) inputs: CalculateIndexInput[],
    @User() user: Player
  ): Promise<CalculateIndexResult[]> {
    if (!user?.id) {
      throw new GraphQLError("Authentication required to calculate index.", {
        extensions: { code: ErrorCode.UNAUTHENTICATED },
      });
    }

    if (!inputs || inputs.length === 0) {
      throw new GraphQLError("inputs must be a non-empty array.", {
        extensions: { code: ErrorCode.BAD_USER_INPUT },
      });
    }

    const keys = inputs.map((i) => i.key);
    if (new Set(keys).size !== keys.length) {
      throw new GraphQLError(
        "inputs contains duplicate key values. Each key must be unique within a batch.",
        {
          extensions: { code: ErrorCode.BAD_USER_INPUT },
        }
      );
    }

    const currentYear = new Date().getFullYear();
    for (const input of inputs) {
      if (input.season < 1990 || input.season > currentYear + 1) {
        throw new GraphQLError(
          `inputs[${input.key}].season is out of range. Must be between 1990 and ${currentYear + 1}.`,
          { extensions: { code: ErrorCode.BAD_USER_INPUT, key: input.key } }
        );
      }
      if (input.subEventCompetitionId && !IsUUID(input.subEventCompetitionId)) {
        throw new GraphQLError(`inputs[${input.key}].subEventCompetitionId is not a valid UUID.`, {
          extensions: { code: ErrorCode.BAD_USER_INPUT, key: input.key },
        });
      }
      for (const player of input.players) {
        if (!IsUUID(player.id)) {
          throw new GraphQLError(
            `inputs[${input.key}].players contains an invalid UUID: ${player.id}.`,
            { extensions: { code: ErrorCode.BAD_USER_INPUT, key: input.key } }
          );
        }
      }
    }

    const serviceInputs = inputs.map((i) => ({
      key: i.key,
      type: i.type,
      season: i.season,
      subEventCompetitionId: i.subEventCompetitionId,
      players: i.players.map((p) => ({ id: p.id })),
    }));

    let serviceResults;
    try {
      serviceResults = await this.indexCalculationService.calculate(serviceInputs, {
        caller: "CalculateIndexResolver.calculateIndex",
      });
    } catch (err) {
      this.logger.error(
        "IndexCalculationService.calculate threw",
        err instanceof Error ? err.stack : String(err)
      );
      throw new GraphQLError("Failed to calculate index.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR },
      });
    }

    return serviceResults.map((result): CalculateIndexResult => {
      if (isSuccess(result)) {
        return {
          key: result.key,
          index: result.index,
          contributingPlayers: result.contributingPlayers,
          missingPlayerCount: result.missingPlayerCount,
        };
      }

      if (isFailure(result)) {
        const code = mapErrorCode(result.error.code);
        this.logger.warn({ key: result.key, code }, result.error.message);
        throw new GraphQLError(result.error.message, {
          extensions: {
            code,
            key: result.key,
            ...(result.error.playerIds ? { playerIds: result.error.playerIds } : {}),
          },
        });
      }

      throw new GraphQLError("Unknown result shape from IndexCalculationService.", {
        extensions: { code: ErrorCode.INTERNAL_ERROR },
      });
    });
  }
}

function mapErrorCode(
  serviceCode:
    | "PLAYER_NOT_FOUND"
    | "RANKING_SYSTEM_NOT_FOUND"
    | "SUB_EVENT_NOT_FOUND"
    | "MISSING_TYPE_OR_SEASON"
    | "RANKING_FETCH_FAILED"
    | "INTERNAL_ERROR"
): string {
  switch (serviceCode) {
    case "PLAYER_NOT_FOUND":
      return ErrorCode.PLAYER_NOT_FOUND;
    case "RANKING_SYSTEM_NOT_FOUND":
      return ErrorCode.RANKING_SYSTEM_NOT_FOUND;
    case "SUB_EVENT_NOT_FOUND":
      return ErrorCode.SUB_EVENT_NOT_FOUND;
    case "MISSING_TYPE_OR_SEASON":
    case "RANKING_FETCH_FAILED":
    case "INTERNAL_ERROR":
    default:
      return ErrorCode.INTERNAL_ERROR;
  }
}
