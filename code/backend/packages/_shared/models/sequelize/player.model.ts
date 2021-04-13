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
import {
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
  Unique
} from 'sequelize-typescript';
import { ClubMembership } from './club-membership.model';
import { Club } from './club.model';
import { Game, GamePlayer } from './event';
import { LastRankingPlace, RankingPlace, RankingPoint } from './ranking';
import { Comment } from './comment.model';
import {
  Claim,
  PlayerClaimMembership,
  PlayerRoleMembership,
  Role
} from './security';
import { TeamPlayerMembership } from './team-player-membership.model';
import { Team } from './team.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Player extends Model {
  constructor(values?: Partial<Player>, options?: BuildOptions) {
    super(values, options);
  }

  @Default(DataType.UUIDV4)
  @IsUUID(4)
  @PrimaryKey
  @Column
  id: string;

  @Column
  email: string;

  @Column
  phone: string;

  @Column
  gender: string;

  @Column
  birthDate: Date;

  @Column
  sub: string;

  @HasMany(() => Team, 'captainId')
  taems: Team[];

  @Unique('unique_constraint')
  @Index
  @Column
  firstName: string;

  @Unique('unique_constraint')
  @Index
  @Column
  lastName: string;

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  @Default(false)
  @Column
  competitionPlayer: boolean;

  @Unique('unique_constraint')
  @Index
  @Column
  memberId: string;

  @HasMany(() => RankingPoint, 'PlayerId')
  rankingPoints?: RankingPoint[];

  @HasMany(() => RankingPlace, 'PlayerId')
  rankingPlaces?: RankingPlace[];

  @HasOne(() => LastRankingPlace, 'playerId')
  lastRankingPlace?: LastRankingPlace;

  @HasMany(() => Comment, 'playerId')
  comments?: Comment[];

  @BelongsToMany(
    () => Team,
    () => TeamPlayerMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  teams: (Team & { TeamPlayerMembership: TeamPlayerMembership })[];

  @BelongsToMany(
    () => Club,
    () => ClubMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  clubs: (Club & { ClubMembership: ClubMembership })[];

  @BelongsToMany(
    () => Game,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  games: (Game & { GamePlayer: GamePlayer })[];

  @BelongsToMany(
    () => Role,
    () => PlayerRoleMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  roles: (Role & { PlayerRoleMembership: PlayerRoleMembership })[];

  @BelongsToMany(
    () => Claim,
    () => PlayerClaimMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  claims: (Claim & { PlayerClaimMembership: PlayerClaimMembership })[];

  // Has many RankingPoints
  getRankingPointss!: HasManyGetAssociationsMixin<RankingPoint>;
  setRankingPointss!: HasManySetAssociationsMixin<RankingPoint, string>;
  addRankingPointss!: HasManyAddAssociationsMixin<RankingPoint, string>;
  addRankingPoints!: HasManyAddAssociationMixin<RankingPoint, string>;
  removeRankingPoints!: HasManyRemoveAssociationMixin<RankingPoint, string>;
  removeRankingPointss!: HasManyRemoveAssociationsMixin<RankingPoint, string>;
  hasRankingPoints!: HasManyHasAssociationMixin<RankingPoint, string>;
  hasRankingPointss!: HasManyHasAssociationsMixin<RankingPoint, string>;
  countRankingPointss!: HasManyCountAssociationsMixin;

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
  setClub!: BelongsToManySetAssociationsMixin<Club, string>;
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

  async getUserClaims(): Promise<string[]> {
    let claims = (await this.getClaims()).map(r => r.name);
    const roles = await this.getRoles({
      include: [Claim]
    });
    claims = [
      ...claims,
      ...roles.map(r => r?.claims.map(c => `${r.clubId}_${c.name}`)).flat()
    ];

    return claims;
  }

  getLastRanking(system: string, max: number): RankingPlace {
    if (!this.rankingPlaces) {
      return null;
    }
    const placesInSystem = this.rankingPlaces.filter(
      x => x.SystemId === system
    );

    const lastRanking = placesInSystem.sort(
      (a, b) => b.rankingDate.getTime() - a.rankingDate.getTime()
    )[0];

    return {
      mix: lastRanking?.mix || max,
      double: lastRanking?.double || max,
      single: lastRanking?.single || max,
      singleInactive: lastRanking?.singleInactive || false,
      doubleInactive: lastRanking?.doubleInactive || false,
      mixInactive: lastRanking?.mixInactive || false
    } as RankingPlace;
  }

  getHighsetRanking(system: string, max: number): RankingPlace {
    if (!this.rankingPlaces) {
      return null;
    }
    const placesInSystem = this.rankingPlaces.filter(
      x => x.SystemId === system
    );

    if (placesInSystem.length <= 0) {
      return {
        single: max,
        double: max,
        mix: max
      } as RankingPlace;
    }

    return {
      single:
        placesInSystem.sort((a, b) => a.single - b.single)[0]?.single || max,
      double:
        placesInSystem.sort((a, b) => a.double - b.double)[0]?.double || max,
      mix: placesInSystem.sort((a, b) => a.mix - b.mix)[0]?.mix || max
    } as RankingPlace;
  }
}
