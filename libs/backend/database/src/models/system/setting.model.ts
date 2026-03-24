import { Field, ID, InputType, ObjectType, OmitType, PartialType } from "@nestjs/graphql";
import {
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";

@Table({
  timestamps: true,
  schema: "system",
  tableName: "Settings",
})
@ObjectType({ description: "Generic admin setting" })
export class AdminSetting extends Model<
  InferAttributes<AdminSetting>,
  InferCreationAttributes<AdminSetting>
> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => String)
  @Unique
  @Column(DataType.STRING)
  declare key: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare description?: string | null;

  @Field(() => Boolean, { nullable: false })
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare enabled: boolean;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  declare startDate?: Date | null;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  declare endDate?: Date | null;

  // JSONB escape hatch — not exposed to GraphQL
  @Column(DataType.JSONB)
  declare meta?: object | null;

  @Field(() => Date, { nullable: true })
  declare createdAt?: Date;

  @Field(() => Date, { nullable: true })
  declare updatedAt?: Date;
}

@InputType()
export class AdminSettingUpdateInput extends PartialType(
  OmitType(AdminSetting, ["createdAt", "updatedAt", "key", "meta"] as const),
  InputType
) {}
