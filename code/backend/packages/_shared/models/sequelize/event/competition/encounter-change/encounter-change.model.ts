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
  HasOne,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique
} from 'sequelize-typescript';
import { DrawCompetition } from '../draw-competition.model';
import { Game } from '../../game.model';
import { Team } from '../../../team.model';
import { EncounterCompetition } from '../encounter-competition.model';
import { EncounterChangeDate } from './encounter-change-date.model';
import { Comment } from '../../../comment.model';

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
    foreignKey:  'encounterChangeId',
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
  setEncounter!: BelongsToSetAssociationMixin<EncounterCompetition, String>;

  // Has many Date
  getDates!: HasManyGetAssociationsMixin<EncounterChangeDate>;
  setDates!: HasManySetAssociationsMixin<EncounterChangeDate, String  >;
  addDates!: HasManyAddAssociationsMixin<EncounterChangeDate, String>;
  addDate!: HasManyAddAssociationMixin<EncounterChangeDate, String>;
  removeDate!: HasManyRemoveAssociationMixin<EncounterChangeDate, String>;
  removeDates!: HasManyRemoveAssociationsMixin<EncounterChangeDate, String>;
  hasDate!: HasManyHasAssociationMixin<EncounterChangeDate, String>;
  hasDates!: HasManyHasAssociationsMixin<EncounterChangeDate, String>;
  countDates!: HasManyCountAssociationsMixin;

  // Has one HomeComment
  getHomeComment!: HasOneGetAssociationMixin<Comment>;
  setHomeComment!: HasOneSetAssociationMixin<Comment, String>;

  // Has one AwayComment
  getAwayComment!: HasOneGetAssociationMixin<Comment>;
  setAwayComment!: HasOneSetAssociationMixin<Comment, String>;
  
}
