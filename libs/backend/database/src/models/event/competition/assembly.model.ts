import { Field, ID, ObjectType } from '@nestjs/graphql';
import { DataTypes } from 'sequelize';
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
} from 'sequelize-typescript';
import { AssemblyType } from '../../../types';
import { Player } from '../../player.model';
import { Team } from '../../team.model';
import { EncounterCompetition } from './encounter-competition.model';


@Table({
  timestamps: true,
  tableName: 'Assemblies',
  schema: 'personal',
})
@ObjectType({ description: 'A assembly' })
export class Assembly extends Model<Assembly> {
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => AssemblyType, { nullable: true })
  @Column({
    type: DataType.JSON,
  })
  assembly?: AssemblyData;

  @Column(DataTypes.TEXT)
  description?: string;

  @ForeignKey(() => EncounterCompetition)
  @Column(DataTypes.UUIDV4)
  encounterId?: string;

  @Field(() => EncounterCompetition, { nullable: true })
  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE',
  })
  encounterCompetition?: EncounterCompetition;

  @ForeignKey(() => Team)
  @Field(() => ID, { nullable: true })
  @Column(DataTypes.UUIDV4)
  teamId?: string;

  @Field(() => Team, { nullable: true })
  @BelongsTo(() => Team, {
    foreignKey: 'teamId',
    onDelete: 'CASCADE',
  })
  team?: Team;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataTypes.UUIDV4)
  captainId?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, {
    foreignKey: 'captainId',
    onDelete: 'CASCADE',
  })
  captain?: Player;

  @ForeignKey(() => Player)
  @Field(() => ID, { nullable: true })
  @Column(DataTypes.UUIDV4)
  playerId?: string;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, {
    foreignKey: 'playerId',
    onDelete: 'CASCADE',
  })
  player?: Player;
}

export interface AssemblyData {
  single1: string;
  single2: string;
  single3: string;
  single4: string;
  double1: string[];
  double2: string[];
  double3: string[];
  double4: string[];
  subtitudes: string[];
}
