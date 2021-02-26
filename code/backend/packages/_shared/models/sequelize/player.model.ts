import {
  BelongsToManyAddAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  BelongsToManyHasAssociationMixin,
  BelongsToManyRemoveAssociationMixin,
  BuildOptions
} from 'sequelize';
import {
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
  Unique
} from 'sequelize-typescript';
import { ClubMembership } from '../..';
import { Club } from './club.model';
import { Game, GamePlayer } from './event';
import { RankingPlace, RankingPoint, RankingSystem } from './ranking';
import { TeamMembership } from './team-membership.model';
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
  gender: string;

  @Column
  birthDate: Date;

  @Column
  token: string;

  @Unique('unique_constraint')
  @Index
  @Column
  firstName: string;

  @Unique('unique_constraint')
  @Index
  @Column
  lastName: string;

  @Unique('unique_constraint')
  @Index
  @Column
  memberId: string;

  @HasMany(() => RankingPoint, 'PlayerId')
  rankingPoints?: RankingPoint[];

  @HasMany(() => RankingPlace, 'PlayerId')
  rankingPlaces?: RankingPlace[];

  @HasMany(() => RankingSystem, {
    foreignKey: 'runById',
    onDelete: 'SET NULL'
  })
  runBy: Player;

  @BelongsToMany(
    () => Team,
    () => TeamMembership
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  teams: (Team & { TeamMembership: TeamMembership })[];

  @BelongsToMany(
    () => Game,
    () => GamePlayer
  )
  // eslint-disable-next-line @typescript-eslint/naming-convention
  games: (Game & { GamePlayer: GamePlayer })[];

  @BelongsToMany(
    () => Club,
    () => ClubMembership
  )
  clubs: Club[];

  public getClubs!: BelongsToManyGetAssociationsMixin<Club>;
  public addClub!: BelongsToManyAddAssociationMixin<Club, string>;
  public removeClub!: BelongsToManyRemoveAssociationMixin<Club, string>;
  public hasClub!: BelongsToManyHasAssociationMixin<Club, string>;

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
