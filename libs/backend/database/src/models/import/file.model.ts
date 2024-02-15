import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BuildOptions } from 'sequelize';
import {
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique,
} from 'sequelize-typescript';
import { EventImportType } from '@badman/utils';

@Table({
  timestamps: true,
  tableName: 'Files',
  schema: 'import',
} as TableOptions)
@ObjectType({ description: 'A ImporterFile' })
export class ImporterFile extends Model {
  constructor(values?: Partial<ImporterFile>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  override id!: string;

  @Field(() => Date, { nullable: true })
  override updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  override createdAt?: Date;

  @Unique('unique_constraint')
  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  name?: string;

  @Unique('unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('COMPETITION_CP', 'COMPETITION_XML', 'TOURNAMENT'))
  type?: EventImportType;

  @Unique('unique_constraint')
  @Field(() => Date, {nullable: true })
  @Column(DataType.DATE)
  firstDay?: Date;

  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  fileLocation?: string;

  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  dates?: string;

  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  linkCode?: string;

  @Field(() => String, {nullable: true })
  @Column(DataType.STRING)
  visualCode?: string;

  @Default(false)
  @Field(() => Boolean, {nullable: true })
  @Column(DataType.BOOLEAN)
  importing?: boolean;

  @Field(() => Int, {nullable: true })
  @Column(DataType.NUMBER)
  tournamentNumber?: number;
}
