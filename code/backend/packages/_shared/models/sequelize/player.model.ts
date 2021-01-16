import { RankingPlace, RankingPoint, RankingSystem } from './ranking';
import {
  BelongsToMany,
  Column,
  DataType,
  HasMany,
  Model,
  Table
} from 'sequelize-typescript';
import { GamePlayer, Game } from './event';
import { TeamMembership } from './team-membership.model';
import { Team } from './team.model';
import { Club } from './club.model';
import { ClubMembership } from './club-membership.model';

@Table({
  timestamps: true,
  schema: 'public'
})
export class Player extends Model<Player> {
  @Column
  email: string;

  @Column
  gender: string;

  @Column
  birthDate: Date;

  @Column
  token: string;

  @Column({ unique: 'compositeIndex' })
  firstName: string;

  @Column({ unique: 'compositeIndex' })
  lastName: string;

  @Column({ unique: 'compositeIndex' })
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

  getLastRanking(system: number, max: number): RankingPlace {
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

  getHighsetRanking(system: number, max: number): RankingPlace {
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
