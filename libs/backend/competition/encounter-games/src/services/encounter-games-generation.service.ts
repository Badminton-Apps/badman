import {
  AssemblyData,
  EncounterCompetition,
  Game,
  GamePlayerMembership,
  RankingLastPlace,
  RankingSystem,
  Team,
} from "@badman/backend-database";
import { GameStatus, GameType, getAssemblyPositionsInOrder, SubEventTypeEnum } from "@badman/utils";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { Transaction } from "sequelize";
import { Sequelize } from "sequelize-typescript";

export interface GameSlot {
  order: number;
  assemblyPosition: string;
  gameType: GameType;
  homePlayerIds: string[];
  awayPlayerIds: string[];
}

@Injectable()
export class EncounterGamesGenerationService {
  private readonly logger = new Logger(EncounterGamesGenerationService.name);

  constructor(private _sequelize: Sequelize) {}

  async generateGames(encounterId: string, transaction?: Transaction): Promise<Game[]> {
    if (transaction) {
      return this._generate(encounterId, transaction);
    }
    return this._sequelize.transaction((t) => this._generate(encounterId, t));
  }

  private async _generate(encounterId: string, transaction: Transaction): Promise<Game[]> {
    // 1. Load encounter with required associations
    const encounter = await EncounterCompetition.findByPk(encounterId, {
      include: [{ model: Team, as: "home" }],
      transaction,
    });

    if (!encounter) {
      throw new NotFoundException(`EncounterCompetition not found: ${encounterId}`);
    }

    // 2. Determine team type from home team
    const home = encounter.home;
    if (!home) {
      throw new NotFoundException(`Home team not found for encounter: ${encounterId}`);
    }

    const teamType = home.type as SubEventTypeEnum;

    if (!teamType || !Object.values(SubEventTypeEnum).includes(teamType)) {
      throw new Error(`Unknown team type "${teamType}" for encounter: ${encounterId}`);
    }

    // 3. Get ordered assembly positions
    const positions = getAssemblyPositionsInOrder(teamType);
    if (positions.length === 0) {
      throw new Error(`No assembly positions found for team type: ${teamType}`);
    }

    // 4. Get home and away assemblies
    const assemblies = await encounter.getAssemblies({ transaction });
    const homeAssembly = assemblies.find((a) => a.teamId === encounter.homeTeamId);
    const awayAssembly = assemblies.find((a) => a.teamId === encounter.awayTeamId);

    const homeData: AssemblyData = homeAssembly?.assembly ?? {};
    const awayData: AssemblyData = awayAssembly?.assembly ?? {};

    // 5. Load existing games for idempotency check
    const existingGames = await Game.findAll({
      where: { linkId: encounterId, linkType: "competition" },
      transaction,
    });

    const existingOrders = new Set(existingGames.map((g) => g.order));

    // 6. Load primary ranking system once
    const system = await RankingSystem.findOne({ where: { primary: true }, transaction });

    // 7. Build slots and create missing games
    const newGames: Game[] = [];

    for (let i = 0; i < positions.length; i++) {
      const order = i + 1;
      const assemblyPosition = positions[i];

      // Skip already-existing slots (idempotency)
      if (existingOrders.has(order)) {
        this.logger.debug(`Slot ${order} already exists for encounter ${encounterId}, skipping`);
        continue;
      }

      const homePlayerIds = this.extractPlayerIds(homeData, assemblyPosition);
      const awayPlayerIds = this.extractPlayerIds(awayData, assemblyPosition);
      const gameType = this.resolveGameType(teamType, assemblyPosition);

      const game = await Game.create(
        {
          linkId: encounterId,
          linkType: "competition",
          order,
          gameType,
          status: GameStatus.NORMAL,
          visualCode: undefined,
        },
        { transaction }
      );

      await this.createPlayerMemberships(
        game.id,
        homePlayerIds,
        awayPlayerIds,
        system?.id,
        transaction
      );

      newGames.push(game);
      this.logger.debug(
        `Created game slot ${order} (${assemblyPosition}, ${gameType}) for encounter ${encounterId}`
      );
    }

    this.logger.log(
      `generateGames: created ${newGames.length} new game(s) for encounter ${encounterId} (${existingOrders.size} already existed)`
    );

    // Return all 8 games
    return Game.findAll({
      where: { linkId: encounterId, linkType: "competition" },
      order: [["order", "ASC"]],
      transaction,
    });
  }

  private extractPlayerIds(data: AssemblyData, position: string): string[] {
    const value = (data as Record<string, string | string[] | undefined>)[position];
    if (!value) return [];
    if (Array.isArray(value)) return value.filter(Boolean);
    return [value];
  }

  private resolveGameType(teamType: SubEventTypeEnum, position: string): GameType {
    if (teamType === SubEventTypeEnum.MX) {
      return GameType.MX;
    }
    return position.startsWith("single") ? GameType.S : GameType.D;
  }

  private async createPlayerMemberships(
    gameId: string,
    homePlayerIds: string[],
    awayPlayerIds: string[],
    systemId: string | undefined,
    transaction: Transaction
  ): Promise<void> {
    const allPlayers: { playerId: string; team: number; player: number }[] = [];

    homePlayerIds.forEach((playerId, idx) => {
      allPlayers.push({ playerId, team: 1, player: idx + 1 });
    });

    awayPlayerIds.forEach((playerId, idx) => {
      allPlayers.push({ playerId, team: 2, player: idx + 1 });
    });

    for (const { playerId, team, player } of allPlayers) {
      const ranking = systemId
        ? await RankingLastPlace.findOne({ where: { playerId, systemId }, transaction })
        : null;

      await GamePlayerMembership.create(
        {
          playerId,
          gameId,
          team,
          player,
          systemId,
          single: ranking?.single,
          double: ranking?.double,
          mix: ranking?.mix,
        },
        { transaction }
      );
    }
  }
}
