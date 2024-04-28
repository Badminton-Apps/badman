import { Game } from './game.model';
import { RankingPlace } from './ranking-place.model';
import moment from 'moment';
import { Club } from './club.model';
import { RankingSystem } from './ranking-system.model';
import { Claim } from './security';
import { Setting } from './personal';
import { Notification } from './personal';
import { ClubMembershipType, TeamMembershipType } from '@badman/utils';
import { Team } from './team.model';

export class Player {
  id!: string;
  _fullName?: string;
  email?: string;
  phone?: string;
  memberId?: string;
  sub?: string;
  slug?: string;
  gender?: 'M' | 'F';
  avatar?: string;
  firstName?: string;
  lastName?: string;
  isClaimed?: boolean;
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
  teams?: Team[];
  permissions?: string[];
  notifications?: Notification[];
  setting?: Setting;

  constructor(args?: Partial<Player>) {
    if (!args?.id) {
      console.error(`${this.constructor.name} needs an id`);
      return;
    }
    this.id = args.id;
    this.memberId = args?.memberId;
    this.gender = args?.gender;
    this.email = args?.email;
    this.phone = args?.phone;
    this.avatar = args?.avatar;
    this.firstName = args?.firstName;
    this.lastName = args?.lastName;
    this._fullName = args?._fullName ?? args?.fullName;
    this.lastRanking =
      (args?.lastRanking ?? null) != null ? new RankingPlace(args?.lastRanking) : undefined;
    this.rankingSystem =
      (args?.rankingSystem ?? null) != null ? new RankingSystem(args?.rankingSystem) : undefined;
    this.games = args?.games?.map((g) => new Game(g));
    this.sub = args?.sub;
    this.slug = args?.slug;
    this.index = args?.index;
    this.indexSplit = args?.indexSplit;
    this.competitionPlayer = args?.competitionPlayer;
    this.clubs = args?.clubs?.map((club) => new Club(club));
    this.club =
      args?.club != null
        ? new Club(args?.club)
        : this.clubs?.filter((club) => club.clubMembership?.active)?.[0];

    this.setting = args?.setting != null ? new Setting(args?.setting) : undefined;
    this.notifications = args?.notifications?.map((n) => new Notification(n)) ?? undefined;
    this.updatedAt = args?.updatedAt != null ? new Date(args.updatedAt) : undefined;
    this.claims = args?.claims?.map((c) => new Claim(c));
    this.teams = args?.teams?.map((t) => new Team(t));
    this.permissions = args?.permissions?.map((p) => p);

    this.rankingPlaces = args?.rankingPlaces?.map((r) => new RankingPlace(r));
    this.rankingLastPlaces = args?.rankingLastPlaces?.map((r) => new RankingPlace(r));
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

export class GamePlayer extends Player {
  rankingPlace?: RankingPlace;
  team?: number;
  player?: number;

  single?: number;
  double?: number;
  mix?: number;

  constructor(args: Partial<GamePlayer>) {
    super(args);

    this.rankingPlace = args?.rankingPlace ? new RankingPlace(args?.rankingPlace) : undefined;
    this.team = args?.team;
    this.player = args?.player;
    this.single = args?.single;
    this.double = args?.double;
    this.mix = args?.mix;
  }
}

export class TeamPlayer extends Player {
  teamMembership!: {
    id: string;
    membershipType: TeamMembershipType;
  };

  constructor(args: Partial<TeamPlayer>) {
    super(args);

    if (!args?.teamMembership) {
      console.error(`${this.constructor.name} needs a teamMembership`);
      return;
    }

    this.teamMembership = args?.teamMembership;
  }
}

export class ClubPlayer extends Player {
  clubMembership!: {
    id: string;
    membershipType: ClubMembershipType;
    active: boolean;
  };

  constructor(args: Partial<ClubPlayer>) {
    super(args);

    if (!args?.clubMembership) {
      console.error(`${this.constructor.name} needs a clubMembership`);
      return;
    }

    this.clubMembership = args?.clubMembership;
  }
}
