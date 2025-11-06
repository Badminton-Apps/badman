// import { SocketEmitter, EVENTS } from '../../../sockets';
import { GameStatus, GameType } from "@badman/utils";
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from "@nestjs/graphql";
import {
  BelongsToGetAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin,
  CreateOptions,
  CreationOptional,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
  UpdateOptions,
} from "sequelize";
import {
  AfterBulkCreate,
  AfterBulkUpdate,
  AfterCreate,
  AfterUpdate,
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
} from "sequelize-typescript";
import { GamePlayerMembershipType } from "../../_interception";
import { Relation } from "../../wrapper";
import { Player } from "../player.model";
import { RankingPoint } from "../ranking";
import { EncounterCompetition } from "./competition/encounter-competition.model";
import { Court } from "./court.model";
import { GamePlayerMembership } from "./game-player.model";
import { DrawTournament } from "./tournament";

export const WINNER_STATUS = {
  NOT_YET_PLAYED: 0,
  HOME_TEAM_WIN: 1,
  AWAY_TEAM_WIN: 2,
  HOME_TEAM_FORFEIT: 4,
  AWAY_TEAM_FORFEIT: 5,
  HOME_TEAM_PLAYER_ABSENT: 6,
  AWAY_TEAM_PLAYER_ABSENT: 7,
  NO_PLAYERS_PRESENT: 10,
  GAME_STOPPED: 12,
  HOME_TEAM_DISQUALIFIED: 106,
  AWAY_TEAM_DISQUALIFIED: 107,
} as const;

/**
 * Valid winner status values
 */
export const VALID_WINNER_VALUES = Object.values(WINNER_STATUS);

@Table({
  timestamps: true,
  schema: "event",
} as TableOptions)
@ObjectType({ description: "A Game" })
export class Game extends Model<InferAttributes<Game>, InferCreationAttributes<Game>> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  playedAt?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM("S", "D", "MX"))
  gameType?: GameType;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM("NORMAL", "WALKOVER", "RETIREMENT", "DISQUALIFIED", "NO_MATCH"))
  status?: GameStatus;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  set1Team1?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  set1Team2?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  set2Team1?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  set2Team2?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  set3Team1?: number;
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  set3Team2?: number;

  @Field(() => Int, { nullable: true })
  @Column({
    type: DataType.NUMBER,
    validate: {
      isIn: {
        args: [VALID_WINNER_VALUES],
        msg: `Winner must be one of: ${VALID_WINNER_VALUES.join(", ")}. Check the winner status const for more info. These statuses match the winner status in the visual tournament.`,
      },
    },
  })
  winner?: number;

  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  order?: number;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  round?: string;

  @Field(() => [RankingPoint], { nullable: true })
  @HasMany(() => RankingPoint, "gameId")
  rankingPoints?: RankingPoint[];

  @Field(() => DrawTournament, { nullable: true })
  @BelongsTo(() => DrawTournament, {
    foreignKey: "linkId",
    constraints: false,
  })
  tournament?: Relation<DrawTournament>;

  @Field(() => EncounterCompetition, { nullable: true })
  @BelongsTo(() => EncounterCompetition, {
    foreignKey: "linkId",
    constraints: false,
  })
  competition?: Relation<EncounterCompetition>;

  @Index("game_parent_index")
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  linkId?: string;

  @Index("game_parent_index")
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  linkType?: string;

  @BelongsTo(() => Court, "courtId")
  court?: Relation<Court>;

  @ForeignKey(() => Court)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  courtId?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  visualCode?: string;

  @Field(() => [GamePlayerMembershipType], { nullable: true })
  @BelongsToMany(() => Player, () => GamePlayerMembership)
  players?: (Player & { GamePlayerMembership: GamePlayerMembership })[];

  @AfterCreate
  @AfterUpdate
  static async gameCreatedOrUpdated(instance: Game, options: CreateOptions | UpdateOptions) {
    await Game.onUpdate(instance, options);
  }

  @AfterBulkCreate
  @AfterBulkUpdate
  static async gamesCreatedOrUpdated(instances: Game[], options: CreateOptions | UpdateOptions) {
    // Ignore duplicates
    instances = instances.filter((a, i) => instances.findIndex((s) => a.linkId === s.linkId) === i);

    for (const instance of instances) {
      await Game.onUpdate(instance, options);
    }
  }

  static async onUpdate(game: Game, options: CreateOptions | UpdateOptions) {
    // Update socket
    // Game.emitSocket(game);

    // Update the score of the encounter
    const encounterCompetition = await game.getCompetition({
      transaction: options.transaction,
    });
    if (encounterCompetition && encounterCompetition.finished === false) {
      await Game.updateEncounterScore(encounterCompetition, options);
    }
  }

  // static emitSocket(game: Game) {
  //   SocketEmitter.emit(
  //     (game.winner ?? 0) === 0
  //       ? EVENTS.GAME.GAME_UPDATED
  //       : EVENTS.GAME.GAME_FINISHED,
  //     game
  //   );
  // }

  static async updateEncounterScore(
    encounter: EncounterCompetition,
    options: CreateOptions | UpdateOptions
  ) {
    const games = await encounter.getGames({
      transaction: options.transaction,
    });
    const scores = games.reduce(
      (acc, game) => {
        const winsForHome: number[] = [
          WINNER_STATUS.HOME_TEAM_WIN,
          WINNER_STATUS.AWAY_TEAM_FORFEIT,
          WINNER_STATUS.AWAY_TEAM_DISQUALIFIED,
          WINNER_STATUS.AWAY_TEAM_PLAYER_ABSENT,
        ];
        const winsForAway: number[] = [
          WINNER_STATUS.AWAY_TEAM_WIN,
          WINNER_STATUS.HOME_TEAM_FORFEIT,
          WINNER_STATUS.HOME_TEAM_DISQUALIFIED,
          WINNER_STATUS.HOME_TEAM_PLAYER_ABSENT,
        ];

        // We don't count WINNER_STATUS.NO_PLAYERS_PRESENT, WINNER_STATUS.GAME_STOPPED
        // In that case, the sum of the scores will be less than 8
        const winnerStatus = game.winner;
        if (winnerStatus) {
          acc.home += winsForHome.includes(winnerStatus) ? 1 : 0;
          acc.away += winsForAway.includes(winnerStatus) ? 1 : 0;
        }
        return acc;
      },
      { home: 0, away: 0 }
    );

    // Only update if scores have actually changed
    if (encounter.homeScore !== scores.home || encounter.awayScore !== scores.away) {
      console.log(
        `Updating encounter score for encounter ${encounter.id} with scores ${scores.home} - ${scores.away}`
      );
      await encounter.update(
        {
          homeScore: scores.home,
          awayScore: scores.away,
        },
        { transaction: options.transaction }
      );
    }
  }

  // Has many RankingPoint
  getRankingPoints!: HasManyGetAssociationsMixin<RankingPoint>;
  setRankingPoints!: HasManySetAssociationsMixin<RankingPoint, string>;
  addRankingPoints!: HasManyAddAssociationsMixin<RankingPoint, string>;
  addRankingPoint!: HasManyAddAssociationMixin<RankingPoint, string>;
  removeRankingPoint!: HasManyRemoveAssociationMixin<RankingPoint, string>;
  removeRankingPoints!: HasManyRemoveAssociationsMixin<RankingPoint, string>;
  hasRankingPoint!: HasManyHasAssociationMixin<RankingPoint, string>;
  hasRankingPoints!: HasManyHasAssociationsMixin<RankingPoint, string>;
  countRankingPoints!: HasManyCountAssociationsMixin;

  // Belongs to Tournament
  getTournament!: BelongsToGetAssociationMixin<DrawTournament>;
  setTournament!: BelongsToSetAssociationMixin<DrawTournament, string>;

  // Belongs to Competition
  getCompetition!: BelongsToGetAssociationMixin<EncounterCompetition>;
  setCompetition!: BelongsToSetAssociationMixin<EncounterCompetition, string>;

  // Belongs to Court
  getCourt!: BelongsToGetAssociationMixin<Court>;
  setCourt!: BelongsToSetAssociationMixin<Court, string>;

  // Belongs to many Players
  getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  setPlayers!: BelongsToManySetAssociationsMixin<Player, string>;
  addPlayers!: BelongsToManyAddAssociationsMixin<Player, string>;
  addPlayer!: BelongsToManyAddAssociationMixin<Player, string>;
  removePlayer!: BelongsToManyRemoveAssociationMixin<Player, string>;
  removePlayers!: BelongsToManyRemoveAssociationsMixin<Player, string>;
  hasPlayer!: BelongsToManyHasAssociationMixin<Player, string>;
  hasPlayers!: BelongsToManyHasAssociationsMixin<Player, string>;
  countPlayer!: BelongsToManyCountAssociationsMixin;
}

@InputType()
export class GameNewInputPlayers {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  systemId!: string;

  @Field(() => Int)
  team!: number;

  @Field(() => Int)
  player!: number;
}

@InputType()
export class GameUpdateInput extends PartialType(
  OmitType(Game, [
    "id",
    "visualCode",
    "rankingPoints",
    "players",
    "competition",
    "linkId",
    "linkType",
    "tournament",
    "createdAt",
    "updatedAt",
  ] as const),
  InputType
) {
  @Field(() => ID, { nullable: true })
  linkId!: string;

  @Field(() => ID, { nullable: true })
  gameId!: string;

  @Field(() => [GameNewInputPlayers], { nullable: true })
  players!: GameNewInputPlayers[];
}

@InputType()
export class GameNewInput extends PartialType(
  OmitType(GameUpdateInput, ["linkId", "players"] as const),
  InputType
) {
  @Field(() => ID, { nullable: true })
  linkId!: string;

  @Field(() => String, { nullable: true })
  linkType!: string;

  @Field(() => [GameNewInputPlayers], { nullable: true })
  players!: GameNewInputPlayers[];
}
