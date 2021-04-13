import { Club } from 'app/_shared';
import { Game } from './game.model';
import { RankingPlace } from './ranking-place.model';

export class Player {
  id: string;
  email: string;
  phone: string;
  memberId: string;
  gender: string;
  avatar: string;
  firstName: string;
  lastName: string;
  base: boolean;
  isClaimed = false;
  rankingPlaces: RankingPlace[];
  lastRanking: RankingPlace;
  games: Game[];
  index: number;
  competitionPlayer: boolean;

  clubs?: Club[];

  constructor(args?: Partial<Player>) {
    this.id = args.id;
    this.memberId = args.memberId;
    this.gender = args.gender;
    this.email = args.email;
    this.phone = args.phone;
    this.avatar = args.avatar;
    this.firstName = args.firstName;
    this.lastName = args.lastName;
    this.isClaimed = args.isClaimed;
    this.lastRanking = args.lastRanking ? new RankingPlace(args.lastRanking) : null;
    this.games = args.games?.map((g) => new Game(g));
    this.base = args.base;
    this.index = args.index;
    this.competitionPlayer = args.competitionPlayer ?? false;
    this.clubs = args.clubs?.map((club) => new Club(club));

    this.rankingPlaces = args.rankingPlaces?.map((r) => new RankingPlace(r));
    if (this.lastRanking == null && this.rankingPlaces != null) {
      this.lastRanking = this.rankingPlaces.sort((a, b) => a.rankingDate.getTime() - b.rankingDate.getTime())[0];
    }
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }
}

export class PlayerGame extends Player {
  rankingPlace: RankingPlace;
  team: number;
  player: number;

  constructor(args: Partial<PlayerGame>) {
    super(args);

    this.rankingPlace = args.rankingPlace ? new RankingPlace(args.rankingPlace) : null;
    this.team = args.team;
    this.player = args.player;
  }
}
