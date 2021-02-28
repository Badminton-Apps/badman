import {
  Column,
  HasOne,
  DataType,
  Model,
  Table,
  TableOptions,
  BelongsTo,
  ForeignKey,
  PrimaryKey,
  Unique,
  IsUUID,
  Default,
  Index,
  HasMany
} from 'sequelize-typescript';
import { BelongsToGetAssociationMixin, BelongsToSetAssociationMixin, BuildOptions, HasManyAddAssociationMixin, HasManyAddAssociationsMixin, HasManyCountAssociationsMixin, HasManyGetAssociationsMixin, HasManyHasAssociationMixin, HasManyHasAssociationsMixin, HasManyRemoveAssociationMixin, HasManyRemoveAssociationsMixin, HasManySetAssociationsMixin } from 'sequelize';
import {
  DrawType,
  GameType,
  ImporterFile,
  LevelType,
  SubEventType
} from '../../../models';
import { ImportDraw } from './import-draw.model';

@Table({
  tableName: 'SubEvents',
  schema: 'import'
} as TableOptions)
export class ImportSubEvent extends Model {
  constructor(values?: Partial<ImportSubEvent>, options?: BuildOptions) {
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

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAAL'))
  levelType: LevelType;

  @Column
  level?: number;

  @Unique('unique_constraint')
  @Column
  internalId: number;

  @HasMany(() => ImportDraw, { foreignKey: 'SubEventId', onDelete: 'CASCADE' })
  draws: ImportDraw[];

  @BelongsTo(() => ImporterFile, { foreignKey: 'FileId', onDelete: 'CASCADE' })
  file: ImporterFile[];

  @Unique('unique_constraint')
  @ForeignKey(() => ImporterFile)
  @Column
  FileId: string;

  // Has many Draw
  getDraws!: HasManyGetAssociationsMixin<ImportDraw>;
  setDraws!: HasManySetAssociationsMixin<ImportDraw, string>;
  addDraws!: HasManyAddAssociationsMixin<ImportDraw, string>;
  addDraw!: HasManyAddAssociationMixin<ImportDraw, string>;
  removeDraw!: HasManyRemoveAssociationMixin<ImportDraw, string>;
  removeDraws!: HasManyRemoveAssociationsMixin<ImportDraw, string>;
  hasDraw!: HasManyHasAssociationMixin<ImportDraw, string>;
  hasDraws!: HasManyHasAssociationsMixin<ImportDraw, string>;
  countDraws!: HasManyCountAssociationsMixin;

  // Belongs to File
  getFile!: BelongsToGetAssociationMixin<ImporterFile>;
  setFile!: BelongsToSetAssociationMixin<ImporterFile, string>;
}
