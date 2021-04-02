import { Game } from './game.model';
import { RankingPlace } from './ranking-place.model';

export class Player {
  id: string;
  memberId: string;
  gender: string;
  avatar: string;
  firstName: string;
  lastName: string;
  base: boolean;
  isClaimed = false;
  rankingPlaces: RankingPlace[];
  games: Game[];

  constructor(args: Partial<Player>) {
    this.id = args.id;
    this.memberId = args.memberId;
    this.gender = args.gender;
    this.avatar = args.avatar;
    this.firstName = args.firstName;
    this.lastName = args.lastName;
    this.isClaimed = args.isClaimed;
    this.rankingPlaces = args.rankingPlaces?.map((r) => new RankingPlace(r));
    this.games = args.games?.map((g) => new Game(g));
    this.base = args.base;
  }
}

export class PlayerGame extends Player {
  rankingPlace: RankingPlace; 
  team: number;
  player: number;

  constructor(args: Partial<PlayerGame>) {
    super(args);

    this.rankingPlace = args.rankingPlace
      ? new RankingPlace(args.rankingPlace)
      : null;
    this.team = args.team;
    this.player = args.player;
  }
}
