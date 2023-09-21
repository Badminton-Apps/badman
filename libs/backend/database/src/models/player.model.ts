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
  BeforeCreate,
  BelongsToMany,
  Column,
  DataType,
  Default,
  HasMany,
  HasOne,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from 'sequelize-typescript';
import { ClubPlayerMembership } from './club-player-membership.model';
import { Club } from './club.model';
import { Comment } from './comment.model';
import { EventEntry, Game, GamePlayerMembership } from './event';
import { RankingLastPlace, RankingPlace, RankingPoint } from './ranking';
import {
  Claim,
  PlayerClaimMembership,
  PlayerRoleMembership,
  Role,
} from './security';
import { TeamPlayerMembership } from './team-player-membership.model';
import { Team } from './team.model';
import {
  Field,
  ID,
  InputType,
  Int,
  ObjectType,
  OmitType,
  PartialType,
} from '@nestjs/graphql';
import { ClubPlayerMembershipType } from '../_interception';
import { Notification, Setting } from './personal';
import { TeamMembershipType } from '@badman/utils';
import { Relation } from '../wrapper';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType('Player', { description: 'A player is also a logged in user' })
export class Player extends Model {
  constructor(values?: Partial<Player>, options?: BuildOptions) {
    super(values, options);
  }

  @Field(() => Date, { nullable: true })
  updatedAt?: Date;

  @Field(() => Date, { nullable: true })
  createdAt?: Date;

  @Field(() => ID)
  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column(DataType.UUIDV4)
  id!: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  email?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  phone?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  gender?: 'M' | 'F';

  @Field(() => Date, { nullable: true })
  @Column(DataType.DATE)
  birthDate?: Date;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  sub?: string;

  @Field(() => [Team], { nullable: true })
  @HasMany(() => Team, 'captainId')
  myTeams?: Relation<Team[]>;

  @HasMany(() => EventEntry, 'player1Id')
  entriesP1?: Relation<EventEntry[]>;

  @HasMany(() => EventEntry, 'player2Id')
  entriesP2?: Relation<EventEntry[]>;

  @Field(() => [EventEntry], { nullable: true })
  get entries() {
    return this.entriesP1?.concat(this.entriesP2 ?? []) ?? [];
  }

  @Field(() => String, { nullable: true })
  @Unique('unique_constraint')
  @Index
  @Column(DataType.STRING)
  firstName?: string;

  @Field(() => String, { nullable: true })
  @Unique('unique_constraint')
  @Index
  @Column(DataType.STRING)
  lastName?: string;

  @Field(() => String, { nullable: true })
  @Column(DataType.VIRTUAL)
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Field(() => Boolean, { nullable: true })
  @Default(false)
  @Column(DataType.BOOLEAN)
  competitionPlayer?: boolean;

  @Field(() => String, { nullable: true })
  @Column(DataType.STRING)
  slug?: string;

  @Field(() => String, { nullable: true })
  @Unique('unique_constraint')
  @Index
  @Column(DataType.STRING)
  memberId?: string;

  @Field(() => [RankingPoint], { nullable: true })
  @HasMany(() => RankingPoint, 'playerId')
  rankingPoints?: RankingPoint[];

  @Field(() => [RankingPlace], { nullable: true })
  @HasMany(() => RankingPlace, 'playerId')
  rankingPlaces?: Relation<RankingPlace[]>;

  @Field(() => [RankingLastPlace], { nullable: true })
  @HasMany(() => RankingLastPlace, 'playerId')
  rankingLastPlaces?: Relation<RankingLastPlace[]>;

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, 'playerId')
  comments?: Relation<Comment[]>;

  @Field(() => [Notification], { nullable: true })
  @HasMany(() => Notification, 'sendToId')
  notifications?: Relation<Notification[]>;

  @Field(() => [Team], { nullable: true })
  @BelongsToMany(() => Team, () => TeamPlayerMembership)
  teams?: (Team & { TeamPlayerMembership: TeamPlayerMembership })[];

  @Field(() => [ClubPlayerMembershipType], { nullable: true })
  @BelongsToMany(() => Club, () => ClubPlayerMembership)
  clubs?: (Club & { ClubMembership: ClubPlayerMembership })[];

  @Field(() => [Game], { nullable: true })
  @BelongsToMany(() => Game, () => GamePlayerMembership)
  games?: (Game & { GamePlayerMembership: GamePlayerMembership })[];

  @Field(() => [Role], { nullable: true })
  @BelongsToMany(() => Role, () => PlayerRoleMembership)
  roles?: (Role & { PlayerRoleMembership?: PlayerRoleMembership })[];

  @Field(() => [Claim], { nullable: true })
  @BelongsToMany(() => Claim, () => PlayerClaimMembership)
  claims?: (Claim & { PlayerClaimMembership?: PlayerClaimMembership })[];

  @Field(() => [String], { nullable: true })
  permissions?: string[];

  @Field(() => Setting, { nullable: true })
  @HasOne(() => Setting)
  setting?: Relation<Setting>;

  // Has many RankingPoints
  getRankingPoints!: HasManyGetAssociationsMixin<RankingPoint>;
  setRankingPoints!: HasManySetAssociationsMixin<RankingPoint, string>;
  addRankingPoints!: HasManyAddAssociationsMixin<RankingPoint, string>;
  addRankingPoint!: HasManyAddAssociationMixin<RankingPoint, string>;
  removeRankingPoint!: HasManyRemoveAssociationMixin<RankingPoint, string>;
  removeRankingPoints!: HasManyRemoveAssociationsMixin<RankingPoint, string>;
  hasRankingPoint!: HasManyHasAssociationMixin<RankingPoint, string>;
  hasRankingPoints!: HasManyHasAssociationsMixin<RankingPoint, string>;
  countRankingPoints!: HasManyCountAssociationsMixin;

  // Has many RankingPlace
  getRankingPlaces!: HasManyGetAssociationsMixin<RankingPlace>;
  setRankingPlaces!: HasManySetAssociationsMixin<RankingPlace, string>;
  addRankingPlaces!: HasManyAddAssociationsMixin<RankingPlace, string>;
  addRankingPlace!: HasManyAddAssociationMixin<RankingPlace, string>;
  removeRankingPlace!: HasManyRemoveAssociationMixin<RankingPlace, string>;
  removeRankingPlaces!: HasManyRemoveAssociationsMixin<RankingPlace, string>;
  hasRankingPlace!: HasManyHasAssociationMixin<RankingPlace, string>;
  hasRankingPlaces!: HasManyHasAssociationsMixin<RankingPlace, string>;
  countRankingPlaces!: HasManyCountAssociationsMixin;

  // Belongs to many Team
  getTeams!: BelongsToManyGetAssociationsMixin<Team>;
  setTeam!: BelongsToManySetAssociationsMixin<Team, string>;
  addTeams!: BelongsToManyAddAssociationsMixin<Team, string>;
  addTeam!: BelongsToManyAddAssociationMixin<Team, string>;
  removeTeam!: BelongsToManyRemoveAssociationMixin<Team, string>;
  removeTeams!: BelongsToManyRemoveAssociationsMixin<Team, string>;
  hasTeam!: BelongsToManyHasAssociationMixin<Team, string>;
  hasTeams!: BelongsToManyHasAssociationsMixin<Team, string>;
  countTeam!: BelongsToManyCountAssociationsMixin;

  // Belongs to many Game
  getGames!: BelongsToManyGetAssociationsMixin<Game>;
  setGame!: BelongsToManySetAssociationsMixin<Game, string>;
  addGames!: BelongsToManyAddAssociationsMixin<Game, string>;
  addGame!: BelongsToManyAddAssociationMixin<Game, string>;
  removeGame!: BelongsToManyRemoveAssociationMixin<Game, string>;
  removeGames!: BelongsToManyRemoveAssociationsMixin<Game, string>;
  hasGame!: BelongsToManyHasAssociationMixin<Game, string>;
  hasGames!: BelongsToManyHasAssociationsMixin<Game, string>;
  countGame!: BelongsToManyCountAssociationsMixin;

  // Belongs to many Club
  getClubs!: BelongsToManyGetAssociationsMixin<Club>;
  setClubs!: BelongsToManySetAssociationsMixin<Club, string>;
  addClubs!: BelongsToManyAddAssociationsMixin<Club, string>;
  addClub!: BelongsToManyAddAssociationMixin<Club, string>;
  removeClub!: BelongsToManyRemoveAssociationMixin<Club, string>;
  removeClubs!: BelongsToManyRemoveAssociationsMixin<Club, string>;
  hasClub!: BelongsToManyHasAssociationMixin<Club, string>;
  hasClubs!: BelongsToManyHasAssociationsMixin<Club, string>;
  countClub!: BelongsToManyCountAssociationsMixin;

  // Belongs to many Claim
  getClaims!: BelongsToManyGetAssociationsMixin<Claim>;
  setClaim!: BelongsToManySetAssociationsMixin<Claim, string>;
  addClaims!: BelongsToManyAddAssociationsMixin<Claim, string>;
  addClaim!: BelongsToManyAddAssociationMixin<Claim, string>;
  removeClaim!: BelongsToManyRemoveAssociationMixin<Claim, string>;
  removeClaims!: BelongsToManyRemoveAssociationsMixin<Claim, string>;
  hasClaim!: BelongsToManyHasAssociationMixin<Claim, string>;
  hasClaims!: BelongsToManyHasAssociationsMixin<Claim, string>;
  countClaim!: BelongsToManyCountAssociationsMixin;

  // Belongs to many Role
  getRoles!: BelongsToManyGetAssociationsMixin<Role>;
  setRole!: BelongsToManySetAssociationsMixin<Role, string>;
  addRoles!: BelongsToManyAddAssociationsMixin<Role, string>;
  addRole!: BelongsToManyAddAssociationMixin<Role, string>;
  removeRole!: BelongsToManyRemoveAssociationMixin<Role, string>;
  removeRoles!: BelongsToManyRemoveAssociationsMixin<Role, string>;
  hasRole!: BelongsToManyHasAssociationMixin<Role, string>;
  hasRoles!: BelongsToManyHasAssociationsMixin<Role, string>;
  countRole!: BelongsToManyCountAssociationsMixin;

  // Has many RankingLastPlace
  getRankingLastPlaces!: HasManyGetAssociationsMixin<RankingLastPlace>;
  setRankingLastPlaces!: HasManySetAssociationsMixin<RankingLastPlace, string>;
  addRankingLastPlaces!: HasManyAddAssociationsMixin<RankingLastPlace, string>;
  addLastRankingPlace!: HasManyAddAssociationMixin<RankingLastPlace, string>;
  removeLastRankingPlace!: HasManyRemoveAssociationMixin<
    RankingLastPlace,
    string
  >;
  removeRankingLastPlaces!: HasManyRemoveAssociationsMixin<
    RankingLastPlace,
    string
  >;
  hasLastRankingPlace!: HasManyHasAssociationMixin<RankingLastPlace, string>;
  hasRankingLastPlaces!: HasManyHasAssociationsMixin<RankingLastPlace, string>;
  countRankingLastPlaces!: HasManyCountAssociationsMixin;

  // Has one Setting
  getSetting!: HasOneGetAssociationMixin<Setting>;
  setSetting!: HasOneSetAssociationMixin<Setting, string>;

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

  // Has many Notification
  getNotifications!: HasManyGetAssociationsMixin<Notification>;
  setNotifications!: HasManySetAssociationsMixin<Notification, string>;
  addNotifications!: HasManyAddAssociationsMixin<Notification, string>;
  addNotification!: HasManyAddAssociationMixin<Notification, string>;
  removeNotification!: HasManyRemoveAssociationMixin<Notification, string>;
  removeNotifications!: HasManyRemoveAssociationsMixin<Notification, string>;
  hasNotification!: HasManyHasAssociationMixin<Notification, string>;
  hasNotifications!: HasManyHasAssociationsMixin<Notification, string>;
  countNotifications!: HasManyCountAssociationsMixin;

  regenerateSlug!: Slugify<Player>;

  @BeforeCreate
  static async forceMemberId(player: Player, options: CreateOptions) {
    if ((player.memberId ?? null) === null) {
      let tries = 0;
      let memberId = '';

      while (tries < 10) {
        (memberId = `unknown-${Math.floor(Math.random() * 90000) + 10000}`), 10;
        const result = await Player.findOne({
          where: { memberId },
          transaction: options.transaction,
        });

        if (result === null) {
          break;
        }
        tries++;
      }

      if (memberId === '') {
        throw new Error('Could not generate memberId');
      }

      player.memberId = memberId;
    }
  }

  async getPermissions(): Promise<string[]> {
    let claims = (await this.getClaims()).map((r) => r.name);
    const roles = await this.getRoles({
      include: [Claim],
    });
    claims = [
      ...claims,
      ...roles
        .map((r) => r?.claims?.map((c) => `${r.linkId}_${c.name}`))
        .flat(),
    ].filter((x) => x !== null && x !== undefined);

    return claims as string[];
  }

  getHighsetRanking(system: string, max: number): RankingPlace | null {
    if (!this.rankingPlaces) {
      return null;
    }
    const placesInSystem = this.rankingPlaces.filter(
      (x) => x.systemId === system
    );

    if (placesInSystem.length <= 0) {
      return {
        single: max,
        double: max,
        mix: max,
      } as RankingPlace;
    }

    return {
      single:
        placesInSystem.sort((a, b) => (a.single ?? 0) - (b.single ?? 0))?.[0]
          ?.single || max,
      double:
        placesInSystem.sort((a, b) => (a.double ?? 0) - (b.double ?? 0))?.[0]
          ?.double || max,
      mix:
        placesInSystem.sort((a, b) => (a.mix ?? 0) - (b.mix ?? 0))?.[0]?.mix ||
        max,
    } as RankingPlace;
  }

  async hasAnyPermission(requiredPermissions: string[]) {
    const claims = await this.getPermissions();
    if (claims === null) {
      return false;
    }

    return requiredPermissions.some((perm) =>
      claims.some((claim) => claim === perm)
    );
  }

  async hasAllPermission(requiredPermissions: string[]) {
    const claims = await this.getPermissions();
    if (claims === null) {
      return false;
    }

    return requiredPermissions.every((perm) =>
      claims.some((claim) => claim === perm)
    );
  }
}

@ObjectType()
export class PagedPlayer {
  @Field(() => Int)
  count?: number;

  @Field(() => [Player])
  rows?: Relation<Player[]>;
}

@InputType()
export class PlayerUpdateInput extends PartialType(
  OmitType(Player, [
    'createdAt',
    'updatedAt',
    'teams',
    'myTeams',
    'clubs',
    'roles',
    'claims',
    'comments',
    'rankingPlaces',
    'rankingPoints',
    'rankingLastPlaces',
    'entries',
    'games',
    'setting',
    'comments',
    'notifications',
  ] as const),
  InputType
) {}

@InputType()
export class PlayerNewInput extends PartialType(
  OmitType(PlayerUpdateInput, ['id'] as const),
  InputType
) {}

@ObjectType()
export class PlayerRankingType extends PartialType(
  OmitType(PlayerUpdateInput, ['sub', 'permissions'] as const),
  ObjectType
) {
  @Field(() => Number, {nullable: true})
  single?: number;

  @Field(() => Number, {nullable: true})
  double?: number;

  @Field(() => Number, {nullable: true})
  mix?: number;
}

@InputType()
export class PlayerTeamInput {
  @Field(() => String)
  id!: string;

  @Field(() => String, { nullable: true })
  membershipType?: Relation<TeamMembershipType>;
}
