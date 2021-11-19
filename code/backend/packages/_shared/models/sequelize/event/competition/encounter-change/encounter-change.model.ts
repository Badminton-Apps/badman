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
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin
} from 'sequelize';
import {
  BelongsTo,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  HasOne,
  IsUUID,
  Model,
  PrimaryKey,
  Table
} from 'sequelize-typescript';
import { Comment } from '../../../comment.model';
import { EncounterCompetition } from '../encounter-competition.model';
import { EncounterChangeDate } from './encounter-change-date.model';

@Table({
  timestamps: true,
  schema: 'event'
})
export class EncounterChange extends Model {
  constructor(values?: Partial<EncounterChange>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  accepted?: boolean;

  @BelongsTo(() => EncounterCompetition, {
    foreignKey: 'encounterId',
    onDelete: 'CASCADE'
  })
  encounter?: EncounterCompetition;

  @ForeignKey(() => EncounterCompetition)
  @Column
  encounterId: string;

  @HasMany(() => EncounterChangeDate, {
    foreignKey: 'encounterChangeId',
    onDelete: 'CASCADE'
  })
  dates: EncounterChangeDate[];

  @HasOne(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'home_comment'
    }
  })
  homeComment: Comment;

  @HasOne(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'away_comment'
    }
  })
  awayComment: Comment;

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

  // Has one HomeComment
  getHomeComment!: HasOneGetAssociationMixin<Comment>;
  setHomeComment!: HasOneSetAssociationMixin<Comment, string>;

  // Has one AwayComment
  getAwayComment!: HasOneGetAssociationMixin<Comment>;
  setAwayComment!: HasOneSetAssociationMixin<Comment, string>;
}
