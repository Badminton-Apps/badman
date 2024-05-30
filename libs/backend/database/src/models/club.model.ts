import { UseForTeamName } from '@badman/utils';
import { Field, ID, InputType, Int, ObjectType, OmitType, PartialType } from '@nestjs/graphql';
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
  CreationOptional,
  HasManyAddAssociationMixin,
  HasManyAddAssociationsMixin,
  HasManyCountAssociationsMixin,
  HasManyGetAssociationsMixin,
  HasManyHasAssociationMixin,
  HasManyHasAssociationsMixin,
  HasManyRemoveAssociationMixin,
  HasManyRemoveAssociationsMixin,
  HasManySetAssociationsMixin,
  InferAttributes,
  InferCreationAttributes,
  Op,
  SaveOptions,
} from 'sequelize';
import {
  AfterBulkCreate,
  AfterCreate,
  AfterUpdate,
  AllowNull,
  BeforeBulkCreate,
  BeforeCreate,
  BeforeUpdate,
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { PlayerWithClubMembershipType } from '../_interception';
import { Slugify } from '../types';
import { Relation } from '../wrapper';
import { ClubPlayerMembership } from './club-player-membership.model';
import { Comment } from './comment.model';
import { Location } from './event';
import { Player } from './player.model';
import { Claim, Role } from './security';
import { Team } from './team.model';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A Club' })
export class Club extends Model<InferAttributes<Club>, InferCreationAttributes<Club>> {
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

  @Unique('club_number_unique')
  @Index
  @AllowNull(false)
  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare name?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare teamName?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare fullName?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare contactCompetition?: string;

  @Default(UseForTeamName.TEAM_NAME)
  @Field(() => String, { defaultValue: UseForTeamName.TEAM_NAME })
  @Column(DataType.ENUM('name', 'fullName', 'abbreviation', 'teamName'))
  declare useForTeamName?: UseForTeamName;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare abbreviation?: string;

  @Unique('club_number_unique')
  @Field(() => Int, { nullable: true })
  @Column(DataType.NUMBER)
  declare clubId?: number;

  @Field(() => [Team], { nullable: true })
  @HasMany(() => Team, 'clubId')
  declare teams?: Relation<Team[]>;

  @Field(() => [Role], { nullable: true })
  @HasMany(() => Role, {
    foreignKey: 'linkId',
    constraints: false,
    scope: {
      linkType: 'club',
    },
  })
  declare roles?: Relation<Role[]>;

  @Field(() => [PlayerWithClubMembershipType], { nullable: true })
  @BelongsToMany(() => Player, () => ClubPlayerMembership)
  declare players?: (Player & { ClubPlayerMembership: ClubPlayerMembership })[];

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment)
  declare comments?: Relation<Comment[]>;

  @Field(() => [Location], { nullable: true })
  @HasMany(() => Location, 'clubId')
  declare locations?: Relation<Location[]>;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare slug?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare state?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  declare country?: string;

  declare regenerateSlug: Slugify<Club>;

  // #endregion

  // #region hooks
  @BeforeUpdate
  @BeforeCreate
  static setAbbriviation(instance: Club) {
    if (!instance.abbreviation && instance.isNewRecord) {
      instance.abbreviation = instance?.name?.match(/\b(\w)/g)?.join('') ?? '';
    }
  }

  @BeforeBulkCreate
  static setAbbriviations(instances: Club[]) {
    for (const instance of instances) {
      this.setAbbriviation(instance);
    }
  }

  @AfterUpdate
  @AfterCreate
  static async setTeamName(instance: Club, options: SaveOptions) {
    const teams = await instance.getTeams({ transaction: options.transaction });
    for (const team of teams) {
      await Team.generateName(team, {}, instance);
      await team.save({ transaction: options.transaction });
    }
  }

  @AfterBulkCreate
  static async setTeamNames(instances: Club[], options: SaveOptions) {
    for (const instance of instances) {
      await this.setTeamName(instance, options);
    }
  }

  static async createBaseRole(instance: Club, options: SaveOptions) {
    const [dbRole, created] = await Role.findOrCreate({
      where: {
        name: 'Admin',
        clubId: instance.id,
      },
      defaults: {
        name: 'Admin',
      },
      transaction: options.transaction,
    });

    if (created) {
      const claims = await Claim.findAll({
        where: {
          type: {
            [Op.in]: ['club', 'team'],
          },
        },
        transaction: options.transaction,
      });

      await dbRole.setClub(instance, { transaction: options.transaction });
      await dbRole.setClaims(claims, { transaction: options.transaction });
    }
  }

  static async createBaseRoles(instances: Club[], options: SaveOptions) {
    for (const club of instances) {
      await this.createBaseRole(club, options);
    }
  }

  // Belongs to many Player
  declare getPlayers: BelongsToManyGetAssociationsMixin<Player>;
  declare setPlayer: BelongsToManySetAssociationsMixin<Player, string>;
  declare addPlayers: BelongsToManyAddAssociationsMixin<Player, string>;
  declare addPlayer: BelongsToManyAddAssociationMixin<Player, string>;
  declare removePlayer: BelongsToManyRemoveAssociationMixin<Player, string>;
  declare removePlayers: BelongsToManyRemoveAssociationsMixin<Player, string>;
  declare hasPlayer: BelongsToManyHasAssociationMixin<Player, string>;
  declare hasPlayers: BelongsToManyHasAssociationsMixin<Player, string>;
  declare countPlayer: BelongsToManyCountAssociationsMixin;

  // Has many Location
  declare getLocations: HasManyGetAssociationsMixin<Location>;
  declare setLocations: HasManySetAssociationsMixin<Location, string>;
  declare addLocations: HasManyAddAssociationsMixin<Location, string>;
  declare addLocation: HasManyAddAssociationMixin<Location, string>;
  declare removeLocation: HasManyRemoveAssociationMixin<Location, string>;
  declare removeLocations: HasManyRemoveAssociationsMixin<Location, string>;
  declare hasLocation: HasManyHasAssociationMixin<Location, string>;
  declare hasLocations: HasManyHasAssociationsMixin<Location, string>;
  declare countLocations: HasManyCountAssociationsMixin;

  // Has many Role
  declare getRoles: HasManyGetAssociationsMixin<Role>;
  declare setRoles: HasManySetAssociationsMixin<Role, string>;
  declare addRoles: HasManyAddAssociationsMixin<Role, string>;
  declare addRole: HasManyAddAssociationMixin<Role, string>;
  declare removeRole: HasManyRemoveAssociationMixin<Role, string>;
  declare removeRoles: HasManyRemoveAssociationsMixin<Role, string>;
  declare hasRole: HasManyHasAssociationMixin<Role, string>;
  declare hasRoles: HasManyHasAssociationsMixin<Role, string>;
  declare countRoles: HasManyCountAssociationsMixin;

  // Has many Team
  declare getTeams: HasManyGetAssociationsMixin<Team>;
  declare setTeams: HasManySetAssociationsMixin<Team, string>;
  declare addTeams: HasManyAddAssociationsMixin<Team, string>;
  declare addTeam: HasManyAddAssociationMixin<Team, string>;
  declare removeTeam: HasManyRemoveAssociationMixin<Team, string>;
  declare removeTeams: HasManyRemoveAssociationsMixin<Team, string>;
  declare hasTeam: HasManyHasAssociationMixin<Team, string>;
  declare hasTeams: HasManyHasAssociationsMixin<Team, string>;
  declare countTeams: HasManyCountAssociationsMixin;

  // Has many Comment
  declare getComments: HasManyGetAssociationsMixin<Comment>;
  declare setComments: HasManySetAssociationsMixin<Comment, string>;
  declare addComments: HasManyAddAssociationsMixin<Comment, string>;
  declare addComment: HasManyAddAssociationMixin<Comment, string>;
  declare removeComment: HasManyRemoveAssociationMixin<Comment, string>;
  declare removeComments: HasManyRemoveAssociationsMixin<Comment, string>;
  declare hasComment: HasManyHasAssociationMixin<Comment, string>;
  declare hasComments: HasManyHasAssociationsMixin<Comment, string>;
  declare countComments: HasManyCountAssociationsMixin;
}

@InputType()
export class ClubUpdateInput extends PartialType(
  OmitType(Club, [
    'createdAt',
    'updatedAt',
    'teams',
    'roles',
    'comments',
    'roles',
    'players',
    'locations',
  ] as const),
  InputType,
) {}

@InputType()
export class ClubNewInput extends PartialType(
  OmitType(ClubUpdateInput, ['id'] as const),
  InputType,
) {}
