import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Game } from '../event/game.model';
import { Player } from '../player.model';
import { RankingSystem } from './ranking-system.model';

@Table({
  timestamps: true,
  schema: 'ranking',
})
@ObjectType({ description: 'A RankingPoint' })
export class RankingPoint extends Model {
  constructor(values?: Partial<RankingPoint>, options?: BuildOptions) {
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
  points: number;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'playerId')
  player: Player;

  @Field(() => Game, { nullable: true })
  @BelongsTo(() => Game, 'gameId')
  game: Game;

  @Field(() => RankingSystem, { nullable: true })
  @BelongsTo(() => RankingSystem, {
    foreignKey: 'systemId',
    onDelete: 'CASCADE',
  })
  type: RankingSystem;

  @ForeignKey(() => RankingSystem)
  @Field({ nullable: true })
  @Column
  rankingDate: Date;

  @Field({ nullable: true })
  @Column
  differenceInLevel: number;

  @ForeignKey(() => RankingSystem)
  @Index('point_system_index')
  @Field({ nullable: true })
  @Column
  systemId: string;

  @ForeignKey(() => Player)
  @Index('point_system_index')
  @Field({ nullable: true })
  @Column
  playerId: string;

  @ForeignKey(() => Game)
  @Field({ nullable: true })
  @Column
  gameId: string;

  // Belongs to Player
  getPlayer!: BelongsToGetAssociationMixin<Player>;
  setPlayer!: BelongsToSetAssociationMixin<Player, string>;

  // Belongs to Game
  getGame!: BelongsToGetAssociationMixin<Game>;
  setGame!: BelongsToSetAssociationMixin<Game, string>;

  // Belongs to Type
  getType!: BelongsToGetAssociationMixin<RankingSystem>;
  setType!: BelongsToSetAssociationMixin<RankingSystem, string>;
}
