import { Comment } from './../../comment.model';
import {
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  TableOptions,
  Unique
} from 'sequelize-typescript';
import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BuildOptions,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin
} from 'sequelize';
import { LevelType } from '../../../enums';
import { Location } from '../location.model';
import { LocationEventCompetition } from './location_event.model';
import { SubEventCompetition } from './sub-event-competition.model';

@Table({
  timestamps: true,
  schema: 'event'
} as TableOptions)
export class EventCompetition extends Model {
  constructor(values?: Partial<EventCompetition>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Unique('unique_constraint')
  @Column
  name: string;

  @Unique('unique_constraint')
  @Column
  startYear: number;

  @HasMany(() => Comment, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'competition'
    }
  })
  comments: Comment[];

  @HasMany(() => SubEventCompetition, {
    foreignKey: 'eventId',
    onDelete: 'CASCADE'
  })
  subEvents: SubEventCompetition[];

  @BelongsToMany(
    () => Location,
    () => LocationEventCompetition
  )
  locations: Location[];

  @Unique('unique_constraint')
  @Column(DataType.ENUM('PROV', 'LIGA', 'NATIONAL'))
  type: LevelType;

  @Column
  uniCode: string;

  @Default(false)
  @Column
  allowEnlisting: boolean;

  // Has many SubEvent
  getSubEvents!: HasManyGetAssociationsMixin<SubEventCompetition>;
  setSubEvents!: HasManySetAssociationsMixin<SubEventCompetition, string>;
  addSubEvents!: HasManyAddAssociationsMixin<SubEventCompetition, string>;
  addSubEvent!: HasManyAddAssociationMixin<SubEventCompetition, string>;
  removeSubEvent!: HasManyRemoveAssociationMixin<SubEventCompetition, string>;
  removeSubEvents!: HasManyRemoveAssociationsMixin<SubEventCompetition, string>;
  hasSubEvent!: HasManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEvents!: HasManyHasAssociationsMixin<SubEventCompetition, string>;
  countSubEvents!: HasManyCountAssociationsMixin;

  // Belongs to many Location
  getLocations!: BelongsToManyGetAssociationsMixin<Location>;
  setLocations!: BelongsToManySetAssociationsMixin<Location, string>;
  addLocations!: BelongsToManyAddAssociationsMixin<Location, string>;
  addLocation!: BelongsToManyAddAssociationMixin<Location, string>;
  removeLocation!: BelongsToManyRemoveAssociationMixin<Location, string>;
  removeLocations!: BelongsToManyRemoveAssociationsMixin<Location, string>;
  hasLocation!: BelongsToManyHasAssociationMixin<Location, string>;
  hasLocations!: BelongsToManyHasAssociationsMixin<Location, string>;
  countLocation!: BelongsToManyCountAssociationsMixin;

  // Has many Comment
  getComments!: HasManyGetAssociationsMixin<Comment>;
  setComments!: HasManySetAssociationsMixin<Comment, string>;
  addComments!: HasManyAddAssociationsMixin<Comment, string>;
  addComment!: HasManyAddAssociationMixin<Comment, string>;
  removeComment!: HasManyRemoveAssociationMixin<Comment, string>;
  removeComments!: HasManyRemoveAssociationsMixin<Comment, string>;
  hasComment!: HasManyHasAssociationMixin<Comment, string>;
  hasComments!: HasManyHasAssociationsMixin<Comment, string>;
  countComments!: HasManyCountAssociationsMixin;
}
