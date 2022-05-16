import { Slugify } from '../types';
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
  HasManySetAssociationsMixin,
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
import { UseForTeamName } from '../enums/useForTeams.enum';
import { ClubMembership } from './club-membership.model';
import { Comment } from './comment.model';
import { Location } from './event';
import { Player } from './player.model';
import { Claim, Role } from './security';
import { Team } from './team.model';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A Club' })
export class Club extends Model {
  constructor(values?: Partial<Club>, options?: BuildOptions) {
    super(values, options);
  }

  // #region fields
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Field(() => ID)
  @Column
  id: string;

  @Unique('club_number_unique')
  @Index
  @AllowNull(false)
  @Field({ nullable: true })
  @Column
  name: string;

  @Field({ nullable: true })
  @Column
  fullName?: string;

  @Default(UseForTeamName.NAME)
  @Field(() => String, { nullable: true })
  @Column(DataType.ENUM('name', 'fullName', 'abbreviation'))
  useForTeamName?: UseForTeamName;

  @Field({ nullable: true })
  @Column
  abbreviation: string;

  @Unique('club_number_unique')
  @Field({ nullable: true })
  @Column
  clubId?: number;

  @HasMany(() => Team, 'clubId')
  teams?: Team[];

  @HasMany(() => Role)
  roles?: Role[];

  @BelongsToMany(() => Player, () => ClubMembership)
  players: Player[];

  @HasMany(() => Comment)
  comments?: Comment[];

  @HasMany(() => Location)
  locations: Location[];

  @Field({ nullable: true })
  @Column
  slug: string;

  regenerateSlug!: Slugify<Club>;

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
      await Team.generateAbbreviation(team, {}, instance);
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

  // #endregion

  // #region mixins

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

  // Has many Location
  getLocations!: HasManyGetAssociationsMixin<Location>;
  setLocations!: HasManySetAssociationsMixin<Location, string>;
  addLocations!: HasManyAddAssociationsMixin<Location, string>;
  addLocation!: HasManyAddAssociationMixin<Location, string>;
  removeLocation!: HasManyRemoveAssociationMixin<Location, string>;
  removeLocations!: HasManyRemoveAssociationsMixin<Location, string>;
  hasLocation!: HasManyHasAssociationMixin<Location, string>;
  hasLocations!: HasManyHasAssociationsMixin<Location, string>;
  countLocations!: HasManyCountAssociationsMixin;

  // Has many Role
  getRoles!: HasManyGetAssociationsMixin<Role>;
  setRoles!: HasManySetAssociationsMixin<Role, string>;
  addRoles!: HasManyAddAssociationsMixin<Role, string>;
  addRole!: HasManyAddAssociationMixin<Role, string>;
  removeRole!: HasManyRemoveAssociationMixin<Role, string>;
  removeRoles!: HasManyRemoveAssociationsMixin<Role, string>;
  hasRole!: HasManyHasAssociationMixin<Role, string>;
  hasRoles!: HasManyHasAssociationsMixin<Role, string>;
  countRoles!: HasManyCountAssociationsMixin;

  // Has many Team
  getTeams!: HasManyGetAssociationsMixin<Team>;
  setTeams!: HasManySetAssociationsMixin<Team, string>;
  addTeams!: HasManyAddAssociationsMixin<Team, string>;
  addTeam!: HasManyAddAssociationMixin<Team, string>;
  removeTeam!: HasManyRemoveAssociationMixin<Team, string>;
  removeTeams!: HasManyRemoveAssociationsMixin<Team, string>;
  hasTeam!: HasManyHasAssociationMixin<Team, string>;
  hasTeams!: HasManyHasAssociationsMixin<Team, string>;
  countTeams!: HasManyCountAssociationsMixin;

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

  // #endregion
}
