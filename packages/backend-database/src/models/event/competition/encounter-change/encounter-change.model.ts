import { ChangeEncounterParty, EncounterChangeViewState } from "@badman/utils";
import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
  registerEnumType,
} from "@nestjs/graphql";
import {
  BelongsToGetAssociationMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
} from "sequelize";
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
} from "sequelize-typescript";

import { Relation } from "../../../../wrapper";
import { EncounterCompetition } from "../encounter-competition.model";
import { EncounterChangeDate, EncounterChangeDateUpdateInput } from "./encounter-change-date.model";

registerEnumType(EncounterChangeViewState, { name: "EncounterChangeViewState" });

@Table({
  timestamps: true,
  schema: "event",
})
@ObjectType({ description: "A EncounterChange" })
export class EncounterChange extends Model {
  constructor(values?: Partial<EncounterChange>, options?: BuildOptions) {
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

  @Field(() => String)
  @Column(DataType.ENUM(...Object.values(ChangeEncounterParty)))
  lastActionBy!: ChangeEncounterParty;

  @Field(() => Date)
  @Column(DataType.DATE)
  lastActionAt!: Date;

  @BelongsTo(() => EncounterCompetition, {
    foreignKey: "encounterId",
    onDelete: "CASCADE",
  })
  encounter?: Relation<EncounterCompetition>;

  @ForeignKey(() => EncounterCompetition)
  @Field(() => ID, { nullable: true })
  @Column(DataType.UUIDV4)
  encounterId?: string;

  @Field(() => [EncounterChangeDate], { nullable: true })
  @HasMany(() => EncounterChangeDate, {
    foreignKey: "encounterChangeId",
    onDelete: "CASCADE",
  })
  dates?: Relation<EncounterChangeDate[]>;

  // Belongs to Encounter
  getEncounter!: BelongsToGetAssociationMixin<EncounterCompetition>;
  setEncounter!: BelongsToSetAssociationMixin<EncounterCompetition, string>;

  // Has many Date
  getDates!: HasManyGetAssociationsMixin<EncounterChangeDate>;
  setDates!: HasManySetAssociationsMixin<EncounterChangeDate, string>;
  addDates!: HasManyAddAssociationsMixin<EncounterChangeDate, string>;
  addDate!: HasManyAddAssociationMixin<EncounterChangeDate, string>;
  removeDate!: HasManyRemoveAssociationMixin<EncounterChangeDate, string>;
  removeDates!: HasManyRemoveAssociationsMixin<EncounterChangeDate, string>;
  hasDate!: HasManyHasAssociationMixin<EncounterChangeDate, string>;
  hasDates!: HasManyHasAssociationsMixin<EncounterChangeDate, string>;
  countDates!: HasManyCountAssociationsMixin;
}

@InputType()
export class EncounterChangeUpdateInput extends PartialType(
  OmitType(EncounterChange, [
    "createdAt",
    "updatedAt",
    "dates",
    "lastActionBy",
    "lastActionAt",
  ] as const),
  InputType
) {
  @Field(() => [EncounterChangeDateUpdateInput], { nullable: true })
  dates?: Relation<EncounterChangeDate[]>;
}
