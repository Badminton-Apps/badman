import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import {
  BelongsToGetAssociationMixin,
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from "sequelize";
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";
import { Relation } from "../../wrapper";
import { Club } from "../club.model";

@Table({ timestamps: true, schema: "event", tableName: "enrollment_remarks" })
@ObjectType("EnrollmentRemark")
export class EnrollmentRemark extends Model<
  InferAttributes<EnrollmentRemark>,
  InferCreationAttributes<EnrollmentRemark>
> {
  @Field(() => ID)
  @PrimaryKey
  @IsUUID(4)
  @Default(DataType.UUIDV4)
  @Column(DataType.UUIDV4)
  declare id: CreationOptional<string>;

  @Field(() => ID)
  @ForeignKey(() => Club)
  @Column(DataType.UUIDV4)
  declare clubId: string;

  @Field(() => Int)
  @Column(DataType.INTEGER)
  declare season: number;

  @Field(() => String)
  @Column(DataType.TEXT)
  declare remarks: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare adminEmail: CreationOptional<string | null>;

  @Field(() => String)
  @Column(DataType.ENUM("rescue", "normal"))
  declare source: "rescue" | "normal";

  @BelongsTo(() => Club)
  declare club?: Relation<Club>;

  declare getClub: BelongsToGetAssociationMixin<Club>;
}
