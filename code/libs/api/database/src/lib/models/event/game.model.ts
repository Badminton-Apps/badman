// import { SocketEmitter, EVENTS } from '../../../sockets';
import { Field, ID, ObjectType } from '@nestjs/graphql';
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
  BuildOptions,
  CreateOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  UpdateOptions,
} from 'sequelize';
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
} from 'sequelize-typescript';
import { GameStatus, GameType } from '../../enums';
import { GamePlayers } from '../../_interception';
import { Player } from '../player.model';
import { RankingPoint } from '../ranking';
import { EncounterCompetition } from './competition/encounter-competition.model';
import { Court } from './court.model';
import { GamePlayer } from './game-player.model';
import { DrawTournament } from './tournament';

@Table({
  timestamps: true,
  schema: 'event',
} as TableOptions)
@ObjectType({ description: 'A Game' })
export class Game extends Model {
  constructor(values?: Partial<Game>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Field({ nullable: true })
  @Column
  playedAt: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Field(() => String, { nullable: true })
  @Column(
    DataType.ENUM(
      'NORMAL',
      'WALKOVER',
      'RETIREMENT',
      'DISQUALIFIED',
      'NO_MATCH'
    )
  )
  status: GameStatus;

  @Field({ nullable: true })
  @Column
  set1Team1?: number;
  @Field({ nullable: true })
  @Column
  set1Team2?: number;
  @Field({ nullable: true })
  @Column
  set2Team1?: number;
  @Field({ nullable: true })
  @Column
  set2Team2?: number;
  @Field({ nullable: true })
  @Column
  set3Team1?: number;
  @Field({ nullable: true })
  @Column
  set3Team2?: number;

  @Field({ nullable: true })
  @Column
  winner?: number;

  @Field({ nullable: true })
  @Column
  order?: number;

  @Field({ nullable: true })
  @Column
  round?: string;

  @Field(() => [RankingPoint], { nullable: true })
  @HasMany(() => RankingPoint, 'GameId')
  rankingPoints?: RankingPoint[];

  @Field(() => DrawTournament, { nullable: true })
  @BelongsTo(() => DrawTournament, {
    foreignKey: 'linkId',
    constraints: false,
  })
  tournament: DrawTournament;

  @Field(() => EncounterCompetition, { nullable: true })
  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'linkId',
    constraints: false,
  })
  competition: EncounterCompetition;

  @Index('game_parent_index')
  @Field({ nullable: true })
  @Column
  linkId: string;

  @Index('game_parent_index')
  @Field({ nullable: true })
  @Column
  linkType: string;

  @BelongsTo(() => Court, 'courtId')
  court: Court;

  @ForeignKey(() => Court)
  @Field({ nullable: true })
  @Column
  courtId: string;

  @Field({ nullable: true })
  @Column
  visualCode: string;

  @Field(() => [GamePlayers], { nullable: true })
  @BelongsToMany(() => Player, () => GamePlayer)
  players: (Player & { GamePlayer: GamePlayer })[];

  @AfterCreate
  @AfterUpdate
  static async gameCreatedOrUpdated(
    instance: Game,
    options: CreateOptions | UpdateOptions
  ) {
    await Game.onUpdate(instance, options);
  }

  @AfterBulkCreate
  @AfterBulkUpdate
  static async gamesCreatedOrUpdated(
    instances: Game[],
    options: CreateOptions | UpdateOptions
  ) {
    // Ignore duplicates
    instances = instances.filter(
      (a, i) => instances.findIndex((s) => a.linkId === s.linkId) === i
    );

    for (const instance of instances) {
      await Game.onUpdate(instance, options);
    }
  }

  static async onUpdate(game: Game, options: CreateOptions | UpdateOptions) {
    // Update socket
    // Game.emitSocket(game);

    // Update the score of the encounter
    const competition = await game.getCompetition({
      transaction: options.transaction,
    });
    if (competition) {
      await Game.updateEncounterScore(competition, options);
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
        acc.home += game.winner === 1 ? 1 : 0;
        acc.away += game.winner === 2 ? 1 : 0;
        return acc;
      },
      { home: 0, away: 0 }
    );
    await encounter.update(
      {
        homeScore: scores.home,
        awayScore: scores.away,
      },
      { transaction: options.transaction }
    );
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
