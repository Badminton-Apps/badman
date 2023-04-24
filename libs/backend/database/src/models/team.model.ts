import {
  getLetterForRegion,
  SubEventTypeEnum,
  UseForTeamName,
} from '@badman/utils';
import {
  Field,
  ID,
  InputType,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import {
  BelongsToGetAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyAddAssociationsMixin,
  BelongsToManyCountAssociationsMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyHasAssociationsMixin,
  BelongsToManyRemoveAssociationMixin,
  BelongsToManyRemoveAssociationsMixin,
  BelongsToManySetAssociationsMixin,
  BelongsToSetAssociationMixin,
  BuildOptions,
  CreateOptions,
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
  HasOneSetAssociationMixin,
} from 'sequelize';
import {
  BeforeBulkCreate,
  BeforeCreate,
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  Default,
  ForeignKey,
  HasMany,
  HasOne,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { Slugify } from '../types';
import { TeamPlayerMembershipType } from '../_interception';
import { Club } from './club.model';
import {
  EncounterCompetition,
  EventEntry,
  EventEntryNewInput,
  EventEntryUpdateInput,
  Location,
  SubEventCompetition,
} from './event';
import { TeamLocationCompetition } from './event/competition/team-location-membership.model';
import { Player, PlayerTeamInput } from './player.model';
import { TeamPlayerMembership } from './team-player-membership.model';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A Team' })
export class Team extends Model {
  constructor(values?: Partial<Team>, options?: BuildOptions) {
    super(values, options);
  }

  @Field({ nullable: true })
  updatedAt?: Date;

  @Field({ nullable: true })
  createdAt?: Date;

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id!: string;

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Column
  name: string;

  @Field({ nullable: false })
  @Column
  season: number;

  @Field(() => String, { nullable: true })
  @Column(DataType.TIME)
  preferredTime: Date;

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @Column
  link: string;


  @Field(() => String, { nullable: true })
  @Column(
    DataType.ENUM(
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday'
    )
  )
  preferredDay: string;

  @BelongsToMany(() => Location, () => TeamLocationCompetition)
  locations: Location[];

  @Field({ nullable: true })
  @Column
  abbreviation: string;

  @HasOne(() => EventEntry, 'teamId')
  entry?: EventEntry;

  @Field(() => Club, { nullable: true })
  @BelongsTo(() => Club, 'clubId')
  club?: Club;

  @Field({ nullable: true })
  @ForeignKey(() => Club)
  @Unique('unique_constraint')
  @Index('club_index')
  @Column
  clubId: string;

  @Field({ nullable: true })
  @Column
  slug: string;

  @Field(() => [TeamPlayerMembershipType], { nullable: true })
  @BelongsToMany(() => Player, () => TeamPlayerMembership)
  players: (Player & { TeamPlayerMembership: TeamPlayerMembership })[];

  @Field(() => String, { nullable: true })
  @Column({
    type: DataType.STRING,
  })
  type: SubEventTypeEnum;

  @Field(() => Player, { nullable: true })
  @BelongsTo(() => Player, 'captainId')
  captain: Player;

  @Field({ nullable: true })
  @Column
  captainId: string;

  @Field({ nullable: true })
  @Column
  email: string;

  @Field({ nullable: true })
  @Column
  phone: string;

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Column
  teamNumber?: number;

  @HasMany(() => EncounterCompetition, 'homeTeamId')
  homeEncounters: EncounterCompetition;

  @HasMany(() => EncounterCompetition, 'awayTeamId')
  awayEncounters: EncounterCompetition;

  // #region hooks
  @BeforeBulkCreate
  static async setAbbriviations(instances: Team[], options: CreateOptions) {
    for (const instance of instances ?? []) {
      await this.setAbbriviation(instance, options);
    }
  }

  @BeforeCreate
  static async setAbbriviation(instance: Team, options: CreateOptions) {
    if (instance.isNewRecord) {
      await this.generateAbbreviation(instance, options);
    }
  }

  static async generateAbbreviation(
    instance: Team,
    options: CreateOptions,
    club?: Club
  ) {
    club =
      club ?? (await instance.getClub({ transaction: options.transaction }));

    switch (club?.useForTeamName ?? UseForTeamName.NAME) {
      case UseForTeamName.FULL_NAME:
        instance.name = `${club.fullName} ${
          instance.teamNumber
        }${getLetterForRegion(instance.type, 'vl')}`;
        break;
      case UseForTeamName.ABBREVIATION:
        instance.name = `${club.abbreviation} ${
          instance.teamNumber
        }${getLetterForRegion(instance.type, 'vl')}`;
        break;

      default:
      case UseForTeamName.NAME:
        instance.name = `${club.name} ${
          instance.teamNumber
        }${getLetterForRegion(instance.type, 'vl')}`;
        break;
    }
  }
  // #endregion

  regenerateSlug!: Slugify<Team>;

  // Belongs to Club
  getClub!: BelongsToGetAssociationMixin<Club>;
  setClub!: BelongsToSetAssociationMixin<Club, string>;

  // Belongs to many Player
  getPlayers!: BelongsToManyGetAssociationsMixin<Player>;
  setPlayer!: BelongsToManySetAssociationsMixin<Player, string>;
  addPlayers!: BelongsToManyAddAssociationsMixin<Player, string>;
  addPlayer!: BelongsToManyAddAssociationMixin<Player, string>;
  removePlayer!: BelongsToManyRemoveAssociationMixin<Player, string>;
  removePlayers!: BelongsToManyRemoveAssociationsMixin<Player, string>;
  hasPlayer!: BelongsToManyHasAssociationMixin<Player, string>;
  hasPlayers!: BelongsToManyHasAssociationsMixin<Player, string>;
  countPlayer!: BelongsToManyCountAssociationsMixin;

  // Belongs to many SubEvent
  getSubEvents!: BelongsToManyGetAssociationsMixin<SubEventCompetition>;
  setSubEvents!: BelongsToManySetAssociationsMixin<SubEventCompetition, string>;
  addSubEvents!: BelongsToManyAddAssociationsMixin<SubEventCompetition, string>;
  addSubEvent!: BelongsToManyAddAssociationMixin<SubEventCompetition, string>;
  removeSubEvent!: BelongsToManyRemoveAssociationMixin<
    SubEventCompetition,
    string
  >;
  removeSubEvents!: BelongsToManyRemoveAssociationsMixin<
    SubEventCompetition,
    string
  >;
  hasSubEvent!: BelongsToManyHasAssociationMixin<SubEventCompetition, string>;
  hasSubEvents!: BelongsToManyHasAssociationsMixin<SubEventCompetition, string>;
  countSubEvent!: BelongsToManyCountAssociationsMixin;

  // Has many HomeEncounter
  getHomeEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setHomeEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addHomeEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addHomeEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeHomeEncounter!: HasManyRemoveAssociationMixin<
    EncounterCompetition,
    string
  >;
  removeHomeEncounters!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasHomeEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasHomeEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countHomeEncounters!: HasManyCountAssociationsMixin;

  // Has many AwayEncounter
  getAwayEncounters!: HasManyGetAssociationsMixin<EncounterCompetition>;
  setAwayEncounters!: HasManySetAssociationsMixin<EncounterCompetition, string>;
  addAwayEncounters!: HasManyAddAssociationsMixin<EncounterCompetition, string>;
  addAwayEncounter!: HasManyAddAssociationMixin<EncounterCompetition, string>;
  removeAwayEncounter!: HasManyRemoveAssociationMixin<
    EncounterCompetition,
    string
  >;
  removeAwayEncounters!: HasManyRemoveAssociationsMixin<
    EncounterCompetition,
    string
  >;
  hasAwayEncounter!: HasManyHasAssociationMixin<EncounterCompetition, string>;
  hasAwayEncounters!: HasManyHasAssociationsMixin<EncounterCompetition, string>;
  countAwayEncounters!: HasManyCountAssociationsMixin;

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

  // Belongs to Captain
  getCaptain!: BelongsToGetAssociationMixin<Player>;
  setCaptain!: BelongsToSetAssociationMixin<Player, string>;

  // Has one Entry
  getEntry!: HasOneGetAssociationMixin<EventEntry>;
  setEntry!: HasOneSetAssociationMixin<EventEntry, string>;
}

@InputType()
export class TeamUpdateInput extends PartialType(
  OmitType(Team, [
    'createdAt',
    'updatedAt',
    'club',
    'players',
    'captain',
    'entry',
  ] as const),
  InputType
) {
  // Include the entry
  @Field(() => EventEntryUpdateInput, { nullable: true })
  entry?: EventEntryUpdateInput;

  // Include the players
  @Field(() => [PlayerTeamInput], { nullable: true })
  players?: PlayerTeamInput[];
}

@InputType()
export class TeamNewInput extends PartialType(
  OmitType(TeamUpdateInput, ['id', 'entry', 'players'] as const),
  InputType
) {
  // Include the entry
  @Field(() => EventEntryNewInput, { nullable: true })
  entry?: EventEntryNewInput;

  // Include the players
  @Field(() => [PlayerTeamInput], { nullable: true })
  players?: PlayerTeamInput[];
}
