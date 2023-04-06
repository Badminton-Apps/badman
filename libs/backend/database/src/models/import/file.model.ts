import { Field, ID, ObjectType } from '@nestjs/graphql';
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
  @Column
  id: string;

  @Unique('unique_constraint')
  @Field({ nullable: true })
  @Column
  name: string;

  @Unique('unique_constraint')
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('COMPETITION_CP', 'COMPETITION_XML', 'TOURNAMENT'))
  type: EventImportType;

  @Unique('unique_constraint')
  @Field({ nullable: true })
  @Column
  firstDay: Date;

  @Field({ nullable: true })
  @Column
  fileLocation: string;

  @Field({ nullable: true })
  @Column
  dates: string;

  @Field({ nullable: true })
  @Column
  linkCode: string;

  @Field({ nullable: true })
  @Column
  visualCode: string;

  @Default(false)
  @Field({ nullable: true })
  @Column
  importing: boolean;

  @Field({ nullable: true })
  @Column
  tournamentNumber: number;
}
