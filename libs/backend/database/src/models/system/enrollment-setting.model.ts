import { Field, ID, InputType, ObjectType, OmitType, PartialType } from "@nestjs/graphql";
import {
  Column,
  DataType,
  Default,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { CreationOptional, InferAttributes, InferCreationAttributes } from "sequelize";

@Table({
  timestamps: true,
  schema: "system",
  tableName: "EnrollmentSettings",
})
@ObjectType({ description: "Enrollment setting" })
export class EnrollmentSetting extends Model<
  InferAttributes<EnrollmentSetting>,
  InferCreationAttributes<EnrollmentSetting>
> {
  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => Date, { nullable: true })
  declare updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  declare createdAt?: Date;

  @Field(() => Boolean, { nullable: false })
  @Default(false)
  @Column(DataType.BOOLEAN)
  declare enrollmentOpen: boolean;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATEONLY)
  declare openDate?: Date | null;

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATEONLY)
  declare closeDate?: Date | null;
}

@InputType()
export class EnrollmentSettingUpdateInput extends PartialType(
  OmitType(EnrollmentSetting, ["createdAt", "updatedAt"] as const),
  InputType,
) {}
