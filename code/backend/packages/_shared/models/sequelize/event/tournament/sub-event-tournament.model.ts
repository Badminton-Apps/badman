import {
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
  Unique
} from 'sequelize-typescript';
import { BuildOptions } from 'sequelize/types';
import { RankingSystemGroup, GroupSubEvents, DrawTournament } from '../..';
import { SubEventType, GameType } from '../../..';
import { EventTournament } from './event-tournament.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class SubEventTournament extends Model {
  constructor(values?: Partial<SubEventTournament>, options?: BuildOptions) {
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
  @Column(DataType.ENUM('S', 'D', 'MX'))
  gameType: GameType;

  @Column
  level?: number;

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsToMany(() => RankingSystemGroup, {
    through: {
      model: () => GroupSubEvents,
      unique: false,
      scope: {
        petType: 'tournament'
      }
    },
    foreignKey: 'subEventId',
    otherKey: 'groupId'
  })
  groups: RankingSystemGroup[];

  @HasMany(() => DrawTournament, 'SubEventId')
  draws: DrawTournament[];

  @BelongsTo(() => EventTournament, 'EventId')
  event?: EventTournament;

  @Unique('unique_constraint')
  @ForeignKey(() => EventTournament)
  @Column
  EventId: string;
}
