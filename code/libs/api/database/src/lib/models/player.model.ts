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
} from 'sequelize';
import {
  BeforeCreate,
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
import { ClubPlayerMemberships } from './club-player-membership.model';
import { Club } from './club.model';
import { Comment } from './comment.model';
import { EventEntry, Game, GamePlayer } from './event';
import { LastRankingPlace, RankingPlace, RankingPoint } from './ranking';
import {
  Claim,
  PlayerClaimMembership,
  PlayerRoleMembership,
  Role,
} from './security';
import { TeamPlayerMembership } from './team-player-membership.model';
import { Team } from './team.model';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Table({
  timestamps: true,
  schema: 'public',
})
@ObjectType({ description: 'A Player' })
export class Player extends Model {
  constructor(values?: Partial<Player>, options?: BuildOptions) {
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
  id: string;

  @Field({ nullable: true })
  @Column
  email: string;

  @Field({ nullable: true })
  @Column
  phone: string;

  @Field({ nullable: true })
  @Column
  gender: string;

  @Field({ nullable: true })
  @Column
  birthDate: Date;

  @Field({ nullable: true })
  @Column
  sub: string;

  @Field(() => [Team], { nullable: true })
  @HasMany(() => Team, 'captainId')
  myTeams: Team[];

  @HasMany(() => EventEntry, 'player1Id')
  entriesP1: EventEntry[];

  @HasMany(() => EventEntry, 'player2Id')
  entriesP2: EventEntry[];

  @Field(() => [EventEntry], { nullable: true })
  get entries() {
    return this.entriesP1.concat(this.entriesP2);
  }

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Index
  @Column
  firstName: string;

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Index
  @Column
  lastName: string;

  @Field({ nullable: true })
  @Column(DataType.VIRTUAL)
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  @Field({ nullable: true })
  @Default(false)
  @Column
  competitionPlayer: boolean;

  @Field({ nullable: true })
  @Column
  slug: string;

  @Field({ nullable: true })
  @Unique('unique_constraint')
  @Index
  @Column
  memberId: string;

  @Field(() => [RankingPoint], { nullable: true })
  @HasMany(() => RankingPoint, 'playerId')
  rankingPoints?: RankingPoint[];

  @Field(() => [RankingPlace], { nullable: true })
  @HasMany(() => RankingPlace, 'playerId')
  rankingPlaces?: RankingPlace[];

  @Field(() => [LastRankingPlace], { nullable: true })
  @HasMany(() => LastRankingPlace, 'playerId')
  lastRankingPlaces?: LastRankingPlace[];

  @Field(() => [Comment], { nullable: true })
  @HasMany(() => Comment, 'playerId')
  comments?: Comment[];

  @Field(() => [Team], { nullable: true })
  @BelongsToMany(() => Team, () => TeamPlayerMembership)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  teams: (Team & { TeamPlayerMembership: TeamPlayerMembership })[];

  @Field(() => [Club], { nullable: true })
  @BelongsToMany(() => Club, () => ClubPlayerMemberships)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  clubs: (Club & { ClubMembership: ClubPlayerMemberships })[];

  @Field(() => [Game], { nullable: true })
  @BelongsToMany(() => Game, () => GamePlayer)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  games: (Game & { GamePlayer: GamePlayer })[];

  @Field(() => [Role], { nullable: true })
  @BelongsToMany(() => Role, () => PlayerRoleMembership)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  roles: (Role & { PlayerRoleMembership: PlayerRoleMembership })[];

  @Field(() => [Claim], { nullable: true })
  @BelongsToMany(() => Claim, () => PlayerClaimMembership)
  // eslint-disable-next-line @typescript-eslint/naming-convention
  claims: (Claim & { PlayerClaimMembership: PlayerClaimMembership })[];

  // Team Player Fields
  @Field({ nullable: true })
  end?: Date;
  @Field({ nullable: true })
  base?: boolean;

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

  // Has many LastRankingPlace
  getLastRankingPlaces!: HasManyGetAssociationsMixin<LastRankingPlace>;
  setLastRankingPlaces!: HasManySetAssociationsMixin<LastRankingPlace, string>;
  addLastRankingPlaces!: HasManyAddAssociationsMixin<LastRankingPlace, string>;
  addLastRankingPlace!: HasManyAddAssociationMixin<LastRankingPlace, string>;
  removeLastRankingPlace!: HasManyRemoveAssociationMixin<
    LastRankingPlace,
    string
  >;
  removeLastRankingPlaces!: HasManyRemoveAssociationsMixin<
    LastRankingPlace,
    string
  >;
  hasLastRankingPlace!: HasManyHasAssociationMixin<LastRankingPlace, string>;
  hasLastRankingPlaces!: HasManyHasAssociationsMixin<LastRankingPlace, string>;
  countLastRankingPlaces!: HasManyCountAssociationsMixin;

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

  async getUserClaims(): Promise<string[]> {
    let claims = (await this.getClaims()).map((r) => r.name);
    const roles = await this.getRoles({
      include: [Claim],
    });
    claims = [
      ...claims,
      ...roles.map((r) => r?.claims.map((c) => `${r.clubId}_${c.name}`)).flat(),
    ];

    return claims;
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
        placesInSystem.sort((a, b) => a.single - b.single)?.[0]?.single || max,
      double:
        placesInSystem.sort((a, b) => a.double - b.double)?.[0]?.double || max,
      mix: placesInSystem.sort((a, b) => a.mix - b.mix)?.[0]?.mix || max,
    } as RankingPlace;
  }
}
