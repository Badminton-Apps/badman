import { CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import { Column, DataType, Default, IsUUID, Model, PrimaryKey, Table } from 'sequelize-typescript';

@Table({
  timestamps: true,
  schema: 'system',
  tableName: 'Rules',
})
export class Rule extends Model<InferAttributes<Rule>, InferCreationAttributes<Rule>> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  declare updatedAt?: Date;
  declare createdAt?: Date;

  @Column(DataType.STRING)
  group!: string;

  @Column(DataType.STRING)
  name!: string;

  @Column(DataType.STRING)
  description!: string;

  @Column(DataType.BOOLEAN)
  activated!: boolean;

  @Column({
    type: DataType.JSON,
  })
  meta?: unknown;
}
