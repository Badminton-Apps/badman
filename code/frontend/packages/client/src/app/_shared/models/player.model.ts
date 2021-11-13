import { Club } from 'app/_shared';
import { Game } from './game.model';
import { RankingPlace } from './ranking-place.model';
import * as moment from 'moment';

export class Player {
  id?: string;
  _fullName?: string;
  email?: string;
  phone?: string;
  memberId?: string;
  sub?: string;
  gender?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  base?: boolean;
  isClaimed = false;
  rankingPlaces?: RankingPlace[];
  lastRanking?: RankingPlace;
  games?: Game[];
  index?: number;
  competitionPlayer?: boolean;

  clubs?: Club[];

  constructor(args?: Partial<Player>) {
    this.id = args?.id;
    this.memberId = args?.memberId;
    this.gender = args?.gender;
    this.email = args?.email;
    this.phone = args?.phone;
    this.avatar = args?.avatar;
    this.firstName = args?.firstName;
    this.lastName = args?.lastName;
    this._fullName = args?.fullName;
    this.isClaimed = args?.isClaimed ?? false;
    this.lastRanking = new RankingPlace(args?.lastRanking);
    this.games = args?.games?.map((g) => new Game(g));
    this.base = args?.base;
    this.sub = args?.sub;
    this.index = args?.index as any;
    this.competitionPlayer = args?.competitionPlayer ?? false;
    this.clubs = args?.clubs?.map((club) => new Club(club));

    this.rankingPlaces = args?.rankingPlaces?.map((r) => new RankingPlace(r));
    if (this.lastRanking == null && this.rankingPlaces != null && this.rankingPlaces.length > 0) {
      this.lastRanking = this.rankingPlaces?.sort((a, b) => a.rankingDate!.getTime() - b.rankingDate!.getTime())[0];
    }
  }

  calcIndex(type: string) {
    return type == 'MX'
      ? (this.lastRanking?.single ?? 12) + (this.lastRanking?.double ?? 12) + (this.lastRanking?.mix ?? 12)
      : (this.lastRanking?.single ?? 12) + (this.lastRanking?.double ?? 12);
  }

  indexOfDate(type?: string, date?: Date) {
    const ranking = this.rankingPlaces?.find((r) => moment(date).isSame(r?.rankingDate));

    return type == 'MX'
      ? (ranking?.single ?? 12) + (ranking?.double ?? 12) + (ranking?.mix ?? 12)
      : (ranking?.single ?? 12) + (ranking?.double ?? 12);
  }

  get fullName() {
    return this._fullName ?? `${this.firstName} ${this.lastName}`;
  }
}

export class PlayerGame extends Player {
  rankingPlace?: RankingPlace;
  team?: number;
  player?: number;

  constructor(args: Partial<PlayerGame>) {
    super(args);

    this.rankingPlace = args?.rankingPlace ? new RankingPlace(args?.rankingPlace) : undefined;
    this.team = args?.team;
    this.player = args?.player;
  }
}
