import {
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import {
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize/types';
import { EventType } from '../../enums';
import { SubEvent } from './sub-event.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class Event extends Model {
  constructor(values?: Partial<Event>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  toernamentNumber: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column
  firstDay: Date;

  @Column
  dates: string;

  @Column(DataType.ENUM('COMPETITION', 'TOERNAMENT'))
  type: EventType;

  @HasMany(() => SubEvent, 'EventId')
  subEvents: SubEvent[];

  @Column
  uniCode: string;

  // Has many subEvent
  getSubEvents!: HasManyGetAssociationsMixin<SubEvent>;
  setSubEvents!: HasManySetAssociationsMixin<SubEvent, string>;
  addSubEvents!: HasManyAddAssociationsMixin<SubEvent, string>;
  addsubEvent!: HasManyAddAssociationMixin<SubEvent, string>;
  removesubEvent!: HasManyRemoveAssociationMixin<SubEvent, string>;
  removeSubEvents!: HasManyRemoveAssociationsMixin<SubEvent, string>;
  hassubEvent!: HasManyHasAssociationMixin<SubEvent, string>;
  hasSubEvents!: HasManyHasAssociationsMixin<SubEvent, string>;
  countSubEvents!: HasManyCountAssociationsMixin;
}
