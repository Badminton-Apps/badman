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
  Unique
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { DrawCompetition, GroupSubEvents, RankingSystemGroup, Team } from '../..';
import { LevelType, SubEventType } from '../../..';
import { EventCompetition } from './event-competition.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEventCompetition extends Model {
  constructor(values?: Partial<SubEventCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('M', 'F', 'MX', 'MINIBAD'))
  eventType: SubEventType;

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @HasMany(() => Team, 'SubEventId')
  teams: Team[];

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(() => RankingSystemGroup, {
    through: {
      model: () => GroupSubEvents,
      unique: false,
      scope: {
        petType: "competition",
      },
    },
    foreignKey: "subEventId",
    otherKey: "groupId",
  })
  groups: RankingSystemGroup[];

  @HasMany(() => DrawCompetition, 'SubEventId')
  draws: DrawCompetition[];

  @BelongsTo(() => EventCompetition, 'EventId')
  event?: EventCompetition;

  @Unique('unique_constraint')
  @ForeignKey(() => EventCompetition)
  @Column
  EventId: string;
}
