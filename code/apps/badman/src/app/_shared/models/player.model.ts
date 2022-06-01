import { Game } from './game.model';
import { RankingPlace } from './ranking-place.model';
import * as moment from 'moment';
import { Club } from './club.model';
import { RankingSystem } from './ranking-system.model';
import { Claim } from './security';

export class Player {
  id?: string;
  _fullName?: string;
  email?: string;
  phone?: string;
  memberId?: string;
  sub?: string;
  slug?: string;
  gender?: string;
  avatar?: string;
  firstName?: string;
  lastName?: string;
  base?: boolean;
  isClaimed = false;
  rankingPlaces?: RankingPlace[];
  rankingLastPlaces?: RankingPlace[];
  games?: Game[];
  index?: number;
  indexSplit?: string;
  competitionPlayer?: boolean;
  updatedAt?: Date;
  rankingSystem?: RankingSystem;
  lastRanking?: RankingPlace;

  clubs?: Club[];
  club?: Club;
  claims?: Claim[];

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
    this.lastRanking =
      (args?.lastRanking ?? null) != null
        ? new RankingPlace(args?.lastRanking)
        : undefined;
    this.rankingSystem =
      (args?.rankingSystem ?? null) != null
        ? new RankingSystem(args?.rankingSystem)
        : undefined;
    this.games = args?.games?.map((g) => new Game(g));
    this.base = args?.base;
    this.sub = args?.sub;
    this.slug = args?.slug;
    this.index = args?.index;
    this.indexSplit = args?.indexSplit;
    this.competitionPlayer = args?.competitionPlayer ?? false;
    this.clubs = args?.clubs?.map((club) => new Club(club));
    this.club = args?.club != null ? new Club(args?.club) : undefined;
    this.updatedAt =
      args?.updatedAt != null ? new Date(args.updatedAt) : undefined;
    this.claims = args?.claims ?? [];

    this.rankingPlaces = args?.rankingPlaces?.map((r) => new RankingPlace(r));
    this.rankingLastPlaces = args?.rankingLastPlaces?.map(
      (r) => new RankingPlace(r)
    );
    if ((this.lastRanking ?? null) == null) {
      let places: RankingPlace[] = [];

      if (this.rankingLastPlaces != null && this.rankingLastPlaces.length > 0) {
        places = this.rankingLastPlaces;
      } else if (this.rankingPlaces != null && this.rankingPlaces.length > 0) {
        places = this.rankingPlaces;
      }

      if (places.length > 0) {
        this.lastRanking = places?.sort((a, b) => {
          if (!a.rankingDate || !b.rankingDate) {
            return 0;
          }
          return a.rankingDate.getTime() - b.rankingDate.getTime();
        })[0];
      }
    }
  }

  indexOfDate(type?: string, date?: Date) {
    const ranking = date
      ? this.rankingPlaces?.find((r) => moment(date).isSame(r?.rankingDate))
      : this.rankingPlaces?.[0];

    return type == 'MX'
      ? (ranking?.single ?? 12) + (ranking?.double ?? 12) + (ranking?.mix ?? 12)
      : (ranking?.single ?? 12) + (ranking?.double ?? 12);
  }

  get fullName() {
    if (this._fullName != null) {
      return this._fullName;
    }

    if (this.firstName != null && this.lastName != null) {
      return `${this.firstName} ${this.lastName}`;
    }

    return 'N/A';
  }
}

export class PlayerGame extends Player {
  rankingPlace?: RankingPlace;
  team?: number;
  player?: number;

  constructor(args: Partial<PlayerGame>) {
    super(args);

    this.rankingPlace = args?.rankingPlace
      ? new RankingPlace(args?.rankingPlace)
      : undefined;
    this.team = args?.team;
    this.player = args?.player;
  }
}
