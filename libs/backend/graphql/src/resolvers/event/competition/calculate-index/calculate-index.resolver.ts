import { User } from "@badman/backend-authorization";
import { Player } from "@badman/backend-database";
import {
  IndexCalculationService,
  isFailure,
  isSuccess,
} from "@badman/backend-enrollment";
import { IsUUID } from "@badman/utils";
import { BadRequestException, Logger, UnauthorizedException } from "@nestjs/common";
import { Args, Query, Resolver } from "@nestjs/graphql";
import { CalculateIndexInput } from "./calculate-index.input";
import { CalculateIndexResult } from "./calculate-index.result";

@Resolver(() => CalculateIndexResult)
export class CalculateIndexResolver {
  private readonly logger = new Logger(CalculateIndexResolver.name);

  constructor(private readonly indexCalculationService: IndexCalculationService) {}

  @Query(() => [CalculateIndexResult], {
    description:
      "Calculate team-strength index for a batch of inputs. Requires authentication. " +
      "Per-input errors are returned in-band (each result carries either index or error); " +
      "the overall request succeeds as long as the batch is well-formed.",
  })
  async calculateIndex(
    @Args({ name: "inputs", type: () => [CalculateIndexInput] }) inputs: CalculateIndexInput[],
    @User() user: Player
  ): Promise<CalculateIndexResult[]> {
    // -----------------------------------------------------------------------
    // T021 — Authentication guard (FR-006a)
    // The @User() decorator returns a stub without `id` for anonymous callers.
    // -----------------------------------------------------------------------
    if (!user?.id) {
      throw new UnauthorizedException("Authentication required to calculate index.");
    }

    // -----------------------------------------------------------------------
    // T020 — Resolver-level batch validation (batch-fatal BadRequestException)
    // -----------------------------------------------------------------------

    // (a) Empty inputs array
    if (!inputs || inputs.length === 0) {
      throw new BadRequestException("inputs must be a non-empty array.");
    }

    // (b) Duplicate key within batch
    const keys = inputs.map((i) => i.key);
    const keySet = new Set(keys);
    if (keySet.size !== keys.length) {
      throw new BadRequestException("inputs contains duplicate key values. Each key must be unique within a batch.");
    }

    // (c) Season range check [1990, currentYear + 1]
    const currentYear = new Date().getFullYear();
    for (const input of inputs) {
      if (input.season < 1990 || input.season > currentYear + 1) {
        throw new BadRequestException(
          `inputs[${input.key}].season is out of range. Must be between 1990 and ${currentYear + 1}.`
        );
      }
    }

    // (d) UUID validation — @IsUUID decorators on the InputType handle most of this
    // at the GraphQL validation layer. Belt-and-suspenders check for any bypass path:
    for (const input of inputs) {
      if (!IsUUID(input.rankingSystemId)) {
        throw new BadRequestException(
          `inputs[${input.key}].rankingSystemId is not a valid UUID.`
        );
      }
      if (input.subEventCompetitionId && !IsUUID(input.subEventCompetitionId)) {
        throw new BadRequestException(
          `inputs[${input.key}].subEventCompetitionId is not a valid UUID.`
        );
      }
      for (const player of input.players) {
        if (!IsUUID(player.id)) {
          throw new BadRequestException(
            `inputs[${input.key}].players[${player.id}].id is not a valid UUID.`
          );
        }
      }
    }

    // -----------------------------------------------------------------------
    // T019 — Delegate to IndexCalculationService
    // -----------------------------------------------------------------------
    const serviceInputs = inputs.map((i) => ({
      key: i.key,
      type: i.type,
      season: i.season,
      rankingSystemId: i.rankingSystemId,
      subEventCompetitionId: i.subEventCompetitionId,
      players: i.players.map((p) => ({
        id: p.id,
        single: p.single,
        double: p.double,
        mix: p.mix,
        gender: p.gender as "M" | "F" | undefined,
      })),
    }));

    const serviceResults = await this.indexCalculationService.calculate(serviceInputs);

    // -----------------------------------------------------------------------
    // T022 — Map service results to GraphQL CalculateIndexResult shape
    // -----------------------------------------------------------------------
    return serviceResults.map((result): CalculateIndexResult => {
      if (isSuccess(result)) {
        return {
          key: result.key,
          index: result.index,
          contributingPlayers: result.contributingPlayers.map((p) => ({
            id: p.id,
            gender: p.gender,
            single: p.single,
            double: p.double,
            mix: p.mix,
          })),
          missingPlayerCount: result.missingPlayerCount,
          error: undefined,
        };
      }

      if (isFailure(result)) {
        return {
          key: result.key,
          index: undefined,
          contributingPlayers: undefined,
          missingPlayerCount: undefined,
          error: {
            code: result.error.code,
            message: result.error.message,
            playerIds: result.error.playerIds,
          },
        };
      }

      // Exhaustive guard — should never reach here.
      this.logger.error("Unknown result shape", result);
      return {
        key: (result as { key: string }).key,
        error: { code: "INTERNAL_ERROR", message: "Unknown result shape from IndexCalculationService" },
      };
    });
  }
}
