import {
  BelongsTo,
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
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions
} from 'sequelize';
import { DrawType } from '../../enums';
import { Game } from './game.model';
import { SubEvent } from './sub-event.model';
 
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

  // Belongs to SubEvent
  getSubEvent!: BelongsToGetAssociationMixin<SubEvent>;
  setSubEvent!: BelongsToSetAssociationMixin<SubEvent, string>;
}
