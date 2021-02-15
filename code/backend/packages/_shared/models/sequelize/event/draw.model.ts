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
import { DrawType, GameType, LevelType, SubEventType } from '../../enums';
import { Event } from './event.model';
import { Game } from './game.model';
import { GroupSubEvents, RankingSystemGroup } from '../ranking';
import { Team } from '../team.model';
import { SubEvent } from './sub-event.model';
import { BuildOptions } from 'sequelize/types';

@Table({
  timestamps: true,
  schema: 'event'
})
export class Draw extends Model {
  constructor(values?: Partial<Draw>, options?: BuildOptions) {
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
  @Column(DataType.ENUM('KO', 'POULE', 'QUALIFICATION'))
  type: DrawType;

  @Column
  size: number;

  @HasMany(() => Game, 'drawId')
  games: Game[];

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @BelongsTo(() => SubEvent, 'SubEventId')
  subEvent?: SubEvent;

  @Unique('unique_constraint')
  @ForeignKey(() => SubEvent)
  @Column
  SubEventId: string;
}
