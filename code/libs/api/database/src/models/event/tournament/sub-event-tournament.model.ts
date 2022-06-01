import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
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
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
} from 'sequelize';
import { EventTournament } from './event-tournament.model';
import { RankingGroupSubEventTournamentMembership } from './group-subevent-membership.model';
import { DrawTournament } from './draw-tournament.model';
import { RankingGroups } from '../../ranking';
import { GameType, SubEventType } from '../../../enums';
import { EventEntry } from '../entry.model';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Table({
  timestamps: true,
  schema: 'event',
})
@ObjectType({ description: 'A SubEventTournament' })
export class SubEventTournament extends Model {
  constructor(values?: Partial<SubEventTournament>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Unique('SubEventTournaments_unique_constraint')
  @Field({ nullable: true })
  @Column
  name: string;

  @Unique('SubEventTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('SubEventTournaments_unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Field({ nullable: true })
  @Column
  level?: number;

  @Unique('SubEventTournaments_unique_constraint')
  @Field({ nullable: true })
  @Column
  visualCode: string;

  @BelongsToMany(
    () => RankingGroups,
    () => RankingGroupSubEventTournamentMembership
  )
  groups: RankingGroups[];

  @HasMany(() => DrawTournament, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE',
  })
  draws: DrawTournament[];

  @Field(() => EventTournament, { nullable: true })
  @BelongsTo(() => EventTournament, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE',
  })
  event?: EventTournament;

  @Unique('SubEventTournaments_unique_constraint')
  @ForeignKey(() => EventTournament)
  @Field({ nullable: true })
  @Column
  eventId: string;

  @HasMany(() => EventEntry, {
    foreignKey: 'subEventId',
    onDelete: 'CASCADE',
    scope: {
      entryType: 'tournament',
    },
  })
  entries: EventEntry[];

  // Belongs to many Group
  getGroups!: BelongsToManyGetAssociationsMixin<RankingGroups>;
  setGroups!: BelongsToManySetAssociationsMixin<RankingGroups, string>;
  addGroups!: BelongsToManyAddAssociationsMixin<RankingGroups, string>;
  addGroup!: BelongsToManyAddAssociationMixin<RankingGroups, string>;
  removeGroup!: BelongsToManyRemoveAssociationMixin<RankingGroups, string>;
  removeGroups!: BelongsToManyRemoveAssociationsMixin<
    RankingGroups,
    string
  >;
  hasGroup!: BelongsToManyHasAssociationMixin<RankingGroups, string>;
  hasGroups!: BelongsToManyHasAssociationsMixin<RankingGroups, string>;
  countGroup!: BelongsToManyCountAssociationsMixin;

  // Has many Draw
  getDraws!: HasManyGetAssociationsMixin<DrawTournament>;
  setDraws!: HasManySetAssociationsMixin<DrawTournament, string>;
  addDraws!: HasManyAddAssociationsMixin<DrawTournament, string>;
  addDraw!: HasManyAddAssociationMixin<DrawTournament, string>;
  removeDraw!: HasManyRemoveAssociationMixin<DrawTournament, string>;
  removeDraws!: HasManyRemoveAssociationsMixin<DrawTournament, string>;
  hasDraw!: HasManyHasAssociationMixin<DrawTournament, string>;
  hasDraws!: HasManyHasAssociationsMixin<DrawTournament, string>;
  countDraws!: HasManyCountAssociationsMixin;

  // Belongs to Event
  getEvent!: BelongsToGetAssociationMixin<EventTournament>;
  setEvent!: BelongsToSetAssociationMixin<EventTournament, string>;
}
