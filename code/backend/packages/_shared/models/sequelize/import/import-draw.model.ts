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
  Unique
} from 'sequelize-typescript';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions } from 'sequelize';
import { DrawType } from '../../enums';
import { ImportSubEvent } from './import-sub-events.model';

@Table({
  tableName: 'Draws',
  schema: 'import'
})
export class ImportDraw extends Model {
  constructor(values?: Partial<ImportDraw>, options?: BuildOptions) {
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

  @Unique('unique_constraint')
  @Column
  internalId: number; 

  @BelongsTo(() => ImportSubEvent, {
    foreignKey: 'subeventId',
    onDelete: 'CASCADE'
  })
  subEvent?: ImportSubEvent;

  @Unique('unique_constraint')
  @ForeignKey(() => ImportSubEvent)
  @Column
  subeventId: string;

  // Belongs to SubEvent
  getSubEvent!: BelongsToGetAssociationMixin<ImportSubEvent>;
  setSubEvent!: BelongsToSetAssociationMixin<ImportSubEvent, string>;
}
